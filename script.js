const script = () => {
  const contentDom = document.getElementById("content");
  const navItems = document.querySelectorAll(".nav-item > a");
  const fetchPage = (url) => {
    fetch(url)
      .then((res) => res.text())
      .then((data) => (contentDom.innerHTML = data));
  };
  const changeTitle = (value) => {
    document.title = value;
  };
  navItems.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const url = item.getAttribute("href");
      fetchPage(url);
      changeTitle(item.innerHTML);
    })
  );

  //default Page
  fetchPage(navItems[0].getAttribute("href"));
  changeTitle(navItems[0].innerHTML);
};

script();
