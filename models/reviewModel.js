const mongoose = require('mongoose')
const Tour = require("./tourModel")

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review cannot be empty"]
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: "Tour",
      required: [true, "Review must belong to a tour"]
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"]
    }
  }, {
  // Si on veut utiliser virtual, il faut rajouter un objet en second argument du schema
  toJSON: { virtual: true },
  toObject: { virtual: true }
}
)

// Pour empêcher un user de poster plusieurs commentaires, on pose comme condition que l id du tour et du user, présents lors de chaque commentaire, doivent être uniques. Combinés, ces conditions nous permettent de limiter à un commentaire par user pour chaque tour
reviewSchema.index({ tour: 1, user: 1 }, { unique: true })

reviewSchema.pre(/^find/, function (next) {
  // Commenté car pour afficher le nom du tour, on se retrouve à populate les reviews eux-mêmes populate par le tour etc..
  // this.populate({
  //   path: "tour",
  //   select: "name"
  // }).populate({
  //   path: "user",
  //   select: "name photo"
  // })
  this.populate({
    path: "user",
    select: "name photo"
  })

  next()
})

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // this points to the model
  // On doit toujours appeler aggregate sur le model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      // On groupe par tour
      // On récupère les champs qui nous intéressent et on calcule
      $group: {
        _id: "$tour",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" }
      }
    }
  ])

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    })
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    })
  }

}

// Function qui va calculer la moyenne des notes après chaque création de nouvelle review
reviewSchema.post("save", function () {
  // this points to current review
  // this.constructor nous permet de pointer vers le model actuel. On ne peut pas mettre this.Review car Review n'est pas encore défini (il l'est dessous) et si on déplace cette fonction plus bas, express ne pourra pas exécuter reviewSchema.post()
  this.constructor.calcAverageRatings(this.tour)
})

// Function qui va calculer la moyenne des notes après chaque modification ou suppression de review
// Trick pour calculer la moyenne et la passer du pre au post middleware (this.review) sinon on n'y a pas accès à cause du lifecycle des middlewares
// On est obligé de passer par ce trick car pour modifier ou supprimer on doit travailler sur la requête et non le document. Or la requête est déjà exécutée avec le post middleware, on ne pourrait tout simplement pas utiliser this.findOne
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.review = await this.findOne()
  next()
})

reviewSchema.post(/^findOneAnd/, async function () {
  await this.review.constructor.calcAverageRatings(this.review.tour)
})

const Review = mongoose.model('Review', reviewSchema)

module.exports = Review