// import axios from "axios";

const loginForm = document.querySelector(".form--login")
const logOutBtn = document.querySelector(".nav__el--logout")



if (loginForm) {
  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const email = document.getElementById("email").value
    const password = document.getElementById("password").value
    login(email, password)
  })
}

const login = async (email, password) => {
  try {
    const result = await axios({
      method: 'POST',
      url: "/api/v1/users/login",
      data: {
        email,
        password
      }
    })

    if (result.data.status === "success") {
      showAlert("success", "Logged In !")
      window.setTimeout(() => {
        location.assign("/")
      }, 1500)
    }

  } catch (e) {
    showAlert("error", e.response.data.message)
  }
}

const logout = async () => {
  try {
    const result = await axios({
      method: "GET",
      url: "/api/v1/users/logout"
    })
    if (result.data.status === "success") {
      location.replace("/")
    }
  } catch (e) {
    showAlert("error", e.response.data.message)
  }
}

if (logOutBtn) {
  logOutBtn.addEventListener("click", logout)
}

const showAlert = (type, message) => {
  hideAlert()
  const markup = `<div class="alert alert--${type}">${message}</div>`;
  document.querySelector("body").insertAdjacentHTML("afterbegin", markup);

  window.setTimeout(hideAlert, 5000)
}

const hideAlert = () => {
  const element = document.querySelector(".alert")
  if (element) {
    element.parentElement.removeChild(element)
  }
}

