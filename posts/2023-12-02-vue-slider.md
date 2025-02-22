---
title: Vue Slide 만들기
author: leejh1316
date: 2023-12-02 22:00:00 +0900
categories: [Frontend, libray]
tags: [javascript, typescript, frontend, vue]
render_with_liquid: false
---

모바일 앱 또는 웹사이트를 서핑하다 보면 스와이핑 하는 요소가 보인다. 이번 주제는 슬라이드 애니메이션을 직접 만드는 것이다.

이번 주제엔 vue, typescript, scss를 사용했다.

데스크탑과 모바일 기기 모두 작동되는 라이브러리를 만들어 보자.

# Event

## 이벤트 적용 방법

슬라이드에 적용해야 하는 이벤트 종류는 다음과 같다.

1.  mousedown / touchstart
2.  mousemove / touchmove
3.  mouseup / touchend

슬라이드를 작동하기 위해선 이벤트 적용 순서가 중요하다.  
위의 번호 순서대로 이벤트를 적용 해야 한다.

move 이벤트 때문에 사용자의 의사에 상관없이 move이벤트가 발생하는것을 방지하기 위해 mousedown(touchstart)을 한 이후로 move 이벤트가 작동되도록 한다.

그다음 move가 다시 발생하는것을 막기위해 mouseup(touchend)을 통해 move이벤트가 작동하지 않도록 한다.

## 이벤트 적용은 window에 해야한다.

mousedown(touchstart)을 제외한 이벤트는 모두 window에 이벤트를 등록해야 한다.

슬라이더 요소에만 모든 이벤트를 등록한다면.
요소를 벗어날때 move 이벤트와 up(end) 이벤트가 발동하지 않는다.

이를 해결하기 위해 window에 이벤트를 등록하여 위와 같은 상황을 예방해야 한다.

## 이벤트 적용 사이클

슬라이더의 시작 이벤트는 해당 요소에. 움직임과 끝나는 이벤트는 window에 등록해야 하지만 처음부터 등록할 필요도, 이벤트가 끝난 다음에도 이벤트를 계속 등록해줄 필요가 없다.

시작 이벤트에 윈도우 이벤트를 등록한뒤 끝나는 이벤트에 윈도우 이벤트를 삭제하는 로직을 만들자.

![slider_event_cycle.png](../assets/img/2023-12-02-vue-slider/slider_event_cycle.png)

## mouse와 touch

슬라이드에서 사용할 두 이벤트는 좌표를 얻는 방식이 다르다.

MouseEvent : 마우스포인터 위치에 대한 좌표를 가지고 있다.

TouchEvent : 터치에 대한 좌표를 각 배열요소가 가지고 있다.

# 기본적인 슬라이드

각 이벤트에 맞는 로직을 만들어서 처리한다.

## 움직이는 방법

슬라이드를 움직이기 위해서 좌표를 계산해야 한다.

- `startCoord : 슬라이드 시작시 초기화 되는 좌표값`
- `currentCoord : 현재 슬라이드의 좌표값`
- `endCoord : 슬라이드를 끝낼시 초기화 되는 좌표값 (currentCoord와 일치해야 한다.)`
- `moveCoord : 슬라이드를 움직인 거리값`

### 왜 endCoord가 currentCoord랑 일치해야 할까?

endCood는 currentCoord와 좌표값이 일치해야 한다. 다음 이벤트 사이클일때 끝나는 좌표를 기억하여 move된 거리만큼 더해줘야 한다.

currentCoord에 바로 더하면 안되는 이유는 다음 코드와 함께 확인하자.

```typescript
//move event일때 아래 로직이 실행된다.
currentCoord.value.x = currentCoord.value.x + moveX;
```

| 이벤트 번호 | 계산 공식      | 결과 |
| ----------- | -------------- | ---- |
| 첫번째      | `0 = 0 + 10`   | 10   |
| 두번째      | `10 = 10 + 20` | 30   |
| 세번째      | `30 = 30 + 30` | 60   |
| 네번째      | `60 = 60 + 40` | 100  |

문제를 발견했는가? 이벤트가 반복적으로 실행될수록 currentCoord의 값은 기하급수적으로 커져간다.

다음은 endCoord를 통해 더한 경우다.

```typescript
currentCoord.value.x = endCoord.value.x = moveX;
```

| 이벤트 사이클 | 이벤트 번호 | 계산 공식      | 결과 |
| ------------- | ----------- | -------------- | ---- |
| 첫번째 사이클 | 첫번째      | `0 = 0 + 10`   | 10   |
| 첫번째 사이클 | 두번째      | `10 = 0 + 20`  | 20   |
| 두번째 사이클 | 첫번째      | `20 = 20 + 10` | 30   |
| 두번째 사이클 | 두번째      | `30 = 20 + 20` | 40   |

값이 일정하게 늘어나는걸 볼 수 있다.

## Slide Start

Slide의 시작과 관련된 로직을 작성해준다.

1. 윈도우에 이벤트 등록
2. 슬라이드 크기 지정
3. 초기화 로직 작성

### 윈도우 이벤트

startEvent와 endEvent에서 사용할 윈도우 이벤트 등록/삭제 함수를 작성한다.

```typescript
function toggleEventListeners(add: boolean) {
  const method = add ? "addEventListener" : "removeEventListener";
  window[method]("mousemove", handleMouseMove, { passive: false });
  window[method]("touchmove", handleTouchMove, { passive: false });
  window[method]("mouseup", finalizeSlideEnd);
  window[method]("touchend", finalizeSlideEnd);
}
```

### 슬라이드 크기

슬라이드의 길이를 알기 위해선 아이템의 너비를 모두 더하면 된다.

슬라이드 최대범위는 두가지의 경우가 존재한다.

1. 아이템의 너비모두 더한 값보다 슬라이드의 너비가 더 클 경우
2. 슬라이드 너비보다 아이템의 너비를 모두 더한 값이 더 클 경우

전자의 경우 `0`으로 초기화 해준다.

후자의 경우 `슬라이드의 너비 - 모두 더한 너비` 를 해준다. 그래야 left의 최소값을 알기 때문이다.

```typescript
function calculateSliderBounds() {
  const offsetWidth = Array.from(elSlider.value?.children ?? []).reduce(
    (width, child) => width + (child?.offsetWidth ?? 0) + (option?.gap ?? 0),
    -option?.gap ?? 0
  );
  const parentOffsetWidth = elSlider.value?.parentElement?.offsetWidth || 0;
  return {
    width: offsetWidth,
    height: elSlider.value?.offsetHeight,
    maxLeft: 0,
    minLeft:
      offsetWidth < parentOffsetWidth ? 0 : parentOffsetWidth - offsetWidth,
  };
}
```

### 초기화 로직

```typescript
function initializeSlideStart(event: MouseEvent | TouchEvent) {
  toggleEventListeners(true);
  startCoord.value = {
    x: event?.pageX ?? event.touches[0].pageX,
    y: event?.pageY ?? event.touches[0].pageY,
  };
  sliderBounds.value = calculateSliderBounds();
}
```

`event?.pageX ?? event.touches[0].pageX`  
마우스 이벤트일때 event.pageX에 데이터가 있다.  
터치 이벤트 일때 event.touches에 데이터가 있다.

`sliderBounds.value = calculateSliderBounds()`  
매번 시작 이벤트마다 슬라이더의 크기를 확인하여 아이템이 추가되거나 크기가 변경되는 상황 등에서 슬라이더가 원활하게 작동되도록 한다.

## Slide Move

Slide Move와 관련된 로직을 작성해준다.

1. 좌표계산
2. 범위 설정

### 좌표계산

마우스와 터치 이벤트에서 공통적으로 사용할 함수를 작성한다.

```typescript
function handleMove(
  moveX: number,
  moveY: number,
  event: MouseEvent | TouchEvent
) {
  if (canSliderMove.value === undefined) {
    canSliderMove.value = Math.abs(moveX) > Math.abs(moveY);
  } else if (canSliderMove.value) {
    event.preventDefault();
    isMoved.value = true;
    moveCoord.value.x = moveX;
    currentCoord.value.x = endCoord.value.x + moveX;
    clampSlideCoord();
  }
}
```

`canSliderMove.value = Math.abs(moveX) > Math.abs(moveY);`  
슬라이드 또는 스크롤인지 판단하는 로직이다.

`else if (canSliderMove.value) {...}`  
슬라이드임을 판단한뒤 preventDefault()로 스크롤을 방지한다.  
계산된 좌표를 업데이트 해준다.  
최소, 최대 left를 제한하는 함수를 함께 실행한다.

```typescript
function handleMouseMove(event: MouseEvent) {
  handleMove(
    event.pageX - startCoord.value.x,
    event.pageX - startCoord.value.y - startCoord.value.y,
    event
  );
}

function handleTouchMove(event: TouchEvent) {
  handleMove(
    event.touches[0].pageX - startCoord.value.x,
    event.touches[0].pageY - startCoord.value.y,
    event
  );
}
```

각 이벤트에 맞는 좌표를 파라미터로 넣어준다.

### 범위제한

```typescript
function clampSlideCoord() {
  const minLeftLimit = sliderBounds.value.minLeft - 60;
  currentCoord.value.x = Math.min(
    60,
    Math.max(currentCoord.value.x, minLeftLimit)
  );
  isClampLimit.value =
    currentCoord.value.x === 60 || currentCoord.value.x === minLeftLimit;
}
```

`Math.min(60,Math.max(currentCoord.value.x, minLeftLimit))`  
left가 최대 60px 이거나, minLeft - 60px 까지를 left가 가능한 범위로 설정한다.

## Slide End

Slide End와 관련된 로직을 작성해준다.

1. 초기화 로직 작성

### 초기화 로직

```typescript
function finalizeSlideEnd(event: MouseEvent | TouchEvent) {
  directionOfSlide.value = moveCoord.value.x < 0 ? "left" : "right";
  endCoord.value = { x: currentCoord.value.x, y: currentCoord.value.y };
  checkEndCoordOver();
  isMoved.value = false;
  isClampLimit.value = false;
  moveCoord.value.x = 0;
  isEndCoordOver.value = false;
  canSliderMove.value = undefined;
  resetSlideCoordOfBoundary();
  toggleEventListeners(false);
}
```

위 함수가 하는 역할이다.

- endCoord를 currentCoord와 일치하도록 업데이트 한다,
- 슬라이드가 끝나는 이벤트엔 설정값들을 기본값으로 초기화 한다.
- 범위를 벗어났을때 위치를 초기화한다.
- 윈도우 이벤트 등록을 해제한다.

### 범위를 벗어났을때 초기화

```typescript
function resetSlideCoordOfBoundary() {
  let isLimit = false;
  const { maxLeft, minLeft } = sliderBounds.value;

  if (endCoord.value.x > maxLeft) {
    endCoord.value.x = maxLeft;
    isLimit = true;
  } else if (endCoord.value.x < minLeft) {
    endCoord.value.x = minLeft;
    isLimit = true;
  }

  if (isLimit) {
    currentCoord.value.x = endCoord.value.x;
  }
}
```

벗어난 범위를 판단하여 좌표를 업데이트 해주는 함수이다.

## 트랜지션 적용

`transition` 속성을 사용하여 기초적인 애니메이션 효과를 넣어보자.

```typescript
function startSlideTransition() {
  clearTimeout(transitionTimerId.value);
  isSlideTransition.value = true;
  elSlider.value?.classList.add("slider--transition");
  transitionTimerId.value = setTimeout(() => {
    elSlider.value?.classList.remove("slider--transition");
    isSlideTransition.value = false;
  }, 250);
}
```

특정 상황에서 애니메이션을 동작시키기 위해 함수를 작성했다.  
이 함수를 `resetSlideCoordOfBoundary`의 마지막 if 실행 부분에 추가하여 슬라이드가 범위를 벗어났을때 부드럽게 범위내로 돌아오도록 하자.

## Vue 컴포넌트 구조

기본적인 기능을 구현했으니 컴포넌트 구조를 작성하여 슬라이더가 작동되도록 하자

다음과 같은 태그 구조로 슬라이드를 컴포넌트화 할것이다.
![tag_structure](../assets//img/2023-12-02-vue-slider/tag_structure.png)

Slide: slide container.  
Slider: event가 적용되는 요소
SlideItem: Slider 내부에 들어갈 요소

코드로 표현하면 다음과 같다.

```html
<Slide>
  <SlideItem></SlideItem>
</Slide>
```

### Slide

```vue
<script setup lang="ts">
import { computed } from "vue";
import { SlideOption } from "../type";
import DefaultSlider from "./Sliders/DefaultSlider.vue";
const props = defineProps<{ slideOption: SlideOption }>();
const sliderComponent = computed(() => {
  if (props.slideOption.sliderType === "default") return DefaultSlider;
});
</script>
<template>
  <div class="slide-container">
    <component :is="sliderComponent" :option="props.slideOption">
      <slot></slot>
    </component>
  </div>
</template>
<style scoped lang="scss">
.slide-container {
  height: inherit;
}
</style>
```

vue component 태그를 이용하여 옵션으로 선택된 슬라이더를 렌더링한다.  
slot을 이용하여 SlideItem이 Slider내부 slot에 렌더링 되도록 한다.

### Default Slider

```vue
<script setup lang="ts">
import { ref } from "vue";
import useSlider from "./useSlider";
import { SlideOption } from "../../type";
const props = defineProps<{
  option: SlideOption;
}>();
const sliderElement = ref<HTMLElement>();
// useSlider는 앞서 작성한 슬라이드 관련 로직들을 처리하는 함수임.
const { currentCoord, initializeSlideStart } = useSlider(
  sliderElement,
  props.option
);
</script>
<template>
  <div
    class="slider-container"
    @mousedown="initializeSlideStart"
    @touchstart="initializeSlideStart"
  >
    <div
      ref="sliderElement"
      class="slider"
      :style="{
        transform: `translateX(${currentCoord.x}px)`,
        gap: props.option.gap + 'px',
        top: currentCoord.y + 'px',
      }"
    >
      <!-- slot에 SliderItem 이 들어간다. -->
      <slot></slot>
    </div>
  </div>
</template>
<style scoped lang="scss">
.slider {
  position: relative;
  top: 0px;
  left: 0px;
  display: flex;
  min-width: 100%;
  flex-wrap: nowrap;
  height: inherit;
  &--transition {
    transition: 0.25s linear all;
  }
}
</style>
```

slider의 엘리먼트 요소를 useSlider()의 파라미터로 넣어주어 .slider 요소가 슬라이드되는 요소임을 알려준다.

> 그림과는 약간 다르게 slider위에 부모태그로 slider-container가 존재한다. slider는 flex레이아웃으로 gap을 설정하는걸 볼 수 있다. gap 부분엔 event가 적용이 되지 않는다. 따라서 부모태그에 이벤트를 등록하여 gap 부분에도 이벤트가 정상적으로 동작하도록 한다.

`position: relative`  
이 포지션 정책을 사용하여 다른 요소와 겹치지 않도록 방지한다.  
좌표에 따라 요소가 변동될 수 있는 포지션 정책이다.

### Slide Item

```vue
<script setup lang="ts"></script>
<template>
  <div class="slide-item">
    <slot></slot>
  </div>
</template>
<style scoped lang="scss">
.slide-item {
  flex-shrink: 0;
}
</style>
```

`flex-shrink: 0`  
부모태그가 flex 레이아웃이니 flex에 의해 크기가 조정되는걸 막아준다.

## 기본적인 슬라이드 결과

기본적인 슬라이드 로직들을 작성했으니 결과를 보자.

아래와 같은 상황일때를 집중해서 보자.

1. 슬라이더의 범위를 벗어났을때
2. 슬라이드를 끝냈을때

![default_slider](../assets/img/2023-12-02-vue-slider/default_slider.gif)

중간에 슬라이드를 끝냈을때 밋밋하게 멈추는 느낌이 있지만, 원하는대로 잘 동작한다.

# Free Slider

중간에 슬라이드가 밋밋하게 끝나는걸 부드럽게 멈추도록 해보자.

## 속도

먼저 슬라이드를 얼마나 빠르게 움직였느냐를 판단하기 위해 속도를 계산해야 한다.

`속도를 구하는 공식`  
$$ v = \frac{\Delta d}{\Delta t} $$

### 시간변화량

시간변화량을 구하는 공식은 다음과 같다.  
$$ \Delta t = t*{\text{최종}} - t*{\text{초기}} $$

초기 시간은 start이벤트에서 측정한다.  
최종 시간은 end이벤트에서 측정한다.

측정 방식은 간단하게 `Date.now()`를 사용한다.

### 거리 변화량

거리의 변화량을 구하는 공식은 다음과 같다.  
$$ \Delta d = d*{\text{최종}} - d*{\text{초기}} $$

위 과정은 이미 move 이벤트에서 처리하고 있으니 moveCoord 변수를 사용한다.

### 속도를 구해보자

```typescript
function calculateVelocity() {
  const speed = !!moveCoord.value.x
    ? moveCoord.value.x / (deltaTime.value * 0.1)
    : 0;
  return speed;
}
```

`true`: moveCoord의 값이 있을땐 속도 공식을 이용하여 계산한다. Date.now()로 측정하면 분모의 값이 커지기 때문에 값을 줄여주었다.  
`false`: moveCoord의 값이 0일땐 속도도 0으로 한다.

## FreeSlider.vue

Default와는 다르게 script부분만 설명하겠다. template와 style 부분은 코드가 동일하기 때문이다.

기존의 슬라이더 로직을 기본으로 가져간 상태로 부드러운 효과를 넣기위해 약간의 수정이 필요하다.

각 이벤트에 추가적인 기능이 동작할 수 있도록 콜백함수를 추가한다.

1. `onSlideStart` : initializeSlideStart의 콜백
2. `onSlideEnd` : finalizeSlideEnd의 콜백
3. `onSlideMove` : handleMove의 콜백

```typescript
import { ref } from "vue";
import useSlider from "./useSlider";
import { SlideOption } from "../../type";

const props = defineProps<{
  option: SlideOption;
}>();
const sliderElement = ref<HTMLElement>();
const {
  onSlideEnd,
  onSlideStart,
  currentCoord,
  endCoord,
  initializeSlideStart,
  isMoved,
  isClampLimit,
  isEndCoordOver,
  slideVelocity,
  clampSlideCoord,
  resetSlideCoordOfBoundary,
} = useSlider(sliderElement, props.option);
const animationFrameId = ref(0);

function animateSlideDeceleration() {
  const friction = 0.98; // 감속계수
  let displacement = slideVelocity.value;

  if (!isClampLimit.value && Math.abs(displacement) > 0.45) {
    currentCoord.value.x += displacement;
    endCoord.value.x = currentCoord.value.x;
    slideVelocity.value *= friction;
    clampSlideCoord();
    animationFrameId.value = requestAnimationFrame(animateSlideDeceleration);
  } else {
    resetSlideCoordOfBoundary();
  }
}

onSlideStart.value = () => {
  cancelAnimationFrame(animationFrameId.value);
};
onSlideEnd.value = () => {
  if (!isMoved.value || isEndCoordOver.value) {
    resetSlideCoordOfBoundary();
    return;
  }
  animationFrameId.value = requestAnimationFrame(animateSlideDeceleration);
};
```

`onSlideStart.value = () => {...}`: 기존에 있던 애니메이션을 종료하는 함수를 호출한다.

`onSlideEnd.value = () => {...}`: 움직임이 없었거나, 애니메이션 이전 이미 슬라이드의 범위를 넘었다면 위치 초기화 함수를 호출하고 애니메이션을 실행하지 않는다.

`function animateSlideDeceleration() {...}`: 산출된 속도의 값을 프레임마다 감속하여 부드럽게 멈추는 효과를 주는 함수다.

> requestAnimationFrame(): 주사율에 맞춰 콜백함수를 실행한다.

## 결과

아래와 같은 상황일때를 집중해서 보자.

1. 슬라이드를 끝냈을때 부드럽게 움직이는 효과

![free_slider](../assets/img/2023-12-02-vue-slider/free_slider.gif)

# Left Slider

슬라이드 아이템이 Slide의 좌측에 맞춰서 슬라이드 되도록 하자.

## 슬라이드 제한

슬라이드 아이템을 인덱스로 선택하여 할 것이기 때문에 오류가 발생하지 않도록 인덱스의 범위를 제한해야 한다.

```typescript
const clampIndex = (index: number, maxIndex: number) => {
  return Math.max(0, Math.min(index, maxIndex));
};
```

## 좌표계산

슬라이드가 끝났을때 endCoord에 가까운 슬라이드아이템을 선택하여 좌측에 정렬해야 한다.

판단하는 방법은 다음과 같다.

![left_judgment](../assets/img/2023-12-02-vue-slider/left_judgment.png)

슬라이드는 빨간색 부분을 기준으로 왼쪽 또는 오른쪽으로 이동한다.  
따라서 판단 기준은 다음과 같다.

- endCoord가 아이템 영역 내부에 있어야 한다.
- 왼쪽으로 슬라이드 할때
  - endCoord가 아이템의 중심을 기준으로 우측에 있을때 해당 아이템의 다음 아이템으로 이동했음을 판단한다.
  - endCoord가 아이템의 중심을 기준으로 좌측에 있을때 해당 아이템으로 이동했음으로 판단한다.
- 오른쪽으로 슬라이드 할때
  - endCoord가 아이템의 중심을 기준으로 우측에 있을때 해당 아이템에서 다음 아이템으로 이동했음으로 판단한다.
  - endCoord가 아이템의 중심을 기준으로 좌측에 있을때 해당 아이템으로 이동했음으로 판단한다.

```typescript
const calculateNextSlideIndex = () => {
  const slideItems = Array.from(sliderElement.value.children);
  let findIndex;

  for (const [index, slideItem] of slideItems.entries()) {
    const absEndCoordX = Math.abs(endCoord.value.x);
    const left = slideItem.offsetLeft;
    const center = left + (slideItem.offsetWidth + props.option.gap) / 2;
    const isInside =
      left < absEndCoordX &&
      absEndCoordX < left + slideItem.offsetWidth + props.option.gap;

    // 슬라이드가 현재 선택 범위 안에 있는지 확인
    if (isInside) {
      const isRightSlide = directionOfSlide.value === "right";
      // 다음 슬라이드를 선택해야 하는지 여부 결정
      const shouldSelectNext =
        (isRightSlide && absEndCoordX >= center) ||
        (!isRightSlide && absEndCoordX > center);

      // 인덱스를 범위 내로 제한
      findIndex = shouldSelectNext
        ? clampIndex(index + 1, slideItems.length - 1)
        : index;
      break;
    }
  }

  // 선택된 인덱스 반환, 없다면 현재 슬라이드 인덱스 반환
  return findIndex ?? currentSlide.value;
};
```

## left 정렬

가장 좌측에 정렬하기 위해서는 특정 아이템의 offseLeft의 값으로 업데이트 해준다. 부모의 포지션 정책이 relative 이기 때문에 부모로부터의 떨어진 값을 구할 수 있다.

```typescript
const moveToSlide = (slideIndex: number) => {
  currentCoord.value.x = -sliderElement.value.children[slideIndex].offsetLeft;
  currentSlide.value = slideIndex;
  endCoord.value.x = currentCoord.value.x;
  startSlideTransition();
};
```

## 속도 이용하기

앞서 free slider를 만들면서 속도를 구했다.  
부호 상관없이 속도의 값이 클수록 사용자가 빠르게 슬라이드 했음을 알 수 있는 값이다.  
사용자 특정 위치까지 슬라이드를 움직일 필요없이 속도를 이용하여 다음 아이템을 보여주자.

```typescript
//속도의 크기
const VELOCITY_THRESHOLD = 3;
```

## onSlideEnd 이벤트 콜백

사용자가 길게 슬라이드 하는경우와 빠르게 하는경우를 고려하여 로직을 작성했다.

```typescript
onSlideEnd.value = () => {
  const isNextSlide = slideVelocity.value <= -VELOCITY_THRESHOLD;
  const isPreviousSlide = slideVelocity.value >= VELOCITY_THRESHOLD;
  if (
    Math.abs(moveCoord.value.x) >
    sliderElement.value.children[0].offsetWidth / 2
  ) {
    moveToSlide(calculateNextSlideIndex());
  } else if (isNextSlide) {
    moveToSlide(currentSlide.value + 1);
  } else if (isPreviousSlide) {
    moveToSlide(currentSlide.value - 1);
  } else {
    moveToSlide(currentSlide.value);
  }
};
```

## 결과

아래와 같은 상황일때를 집중해서 보자.

1. 슬라이드를 길게 했을때
2. 슬라이드를 빠르게 했을때

![left_slider](../assets/img/2023-12-02-vue-slider/left_slider.gif)

# Vue Slide를 이용한 다른 결과물

유튜브 뮤직 레이아웃이 Vue Slide를 활용한 예시를 가장 잘보여줄 수 있을 거라 생각하여 만들어 보았다.

![slider_result](../assets/img/2023-12-02-vue-slider/slider_result.gif)

![slider_mobile_result](../assets/img/2023-12-02-vue-slider/mobild_slider_result.gif)
