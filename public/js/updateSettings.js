

const userDataForm = document.querySelector(".form-user-data")
const userPasswordForm = document.querySelector(".form-user-password")

// Type is either password or data (name/email)
const updateSettings = async (data, type) => {
  try {
    const url = type === "password" ? "/api/v1/users/updateMyPassword" : "/api/v1/users/updateMe"

    const res = await axios({
      method: "PATCH",
      url,
      data
    })

    if (res.data.status === "success") {
      showAlert("success", "Info updated")
    }
  } catch (err) {
    showAlert("error", err.response.data.message);
  }
}


if (userDataForm) {
  userDataForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = new FormData()
    form.append("name", document.getElementById("name").value)
    form.append("email", document.getElementById("email").value)
    form.append("photo", document.getElementById("photo").files[0])

    updateSettings(form, "data")
  })
}

if (userPasswordForm) {
  userPasswordForm.addEventListener("submit", async event => {
    event.preventDefault();
    document.querySelector(".btn--save-password").textContent = "Updating password..."

    const passwordCurrent = document.getElementById("password-current").value
    const password = document.getElementById("password").value
    const passwordConfirm = document.getElementById("password-confirm").value

    await updateSettings({ passwordCurrent, password, passwordConfirm }, "password")

    document.querySelector(".btn--save-password").textContent = "Save password"
    document.getElementById("password-current").value = ""
    document.getElementById("password").value = ""
    document.getElementById("password-confirm").value = ""

  })
}

const alertMessage = document.querySelector("body").dataset.alert
if (alertMessage) showAlert("success", alertMessage, 20)