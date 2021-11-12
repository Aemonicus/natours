const stripe = Stripe("pk_test_51JuNW8L1fvCEbdD9yVwUWxOoussOR7lBvZ1lU2l9X0x3eRPjKWFLAMCc6gf1Si9XwtYuyJuBW8VCNJUWE2YrX1GX00RQPFdEHq")

const bookBtn = document.getElementById("book-tour")


if (bookBtn) {
  bookBtn.addEventListener("click", event => {
    event.target.textContent = "Processing..."
    // Equivalent à dessous
    // const tourId = event.target.dataset.tourId
    const { tourId } = event.target.dataset
    bookTour(tourId)
  })

}

const bookTour = async tourId => {
  try {
    const session = await axios(`/api/v1/booking/checkout-session/${tourId}`)

    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    })

  } catch (e) {
    showAlert("error", e.response.data.message)
  }
}

