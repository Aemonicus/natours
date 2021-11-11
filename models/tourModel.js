const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// User for Embed version
// const User = require('./userModel');


// L'utilisation de mongoose, interface entre l'application et la BDD (MongoDb ici), se fait en deux étapes :
// - Création d'un schema qui définit les valeurs des données et leur type
// - Création de models sur la base des schema

const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    // Si on veut inclure le message d'erreur à required, on rentre le premier paramètre pour le rendre obligatoire puis le message d'erreur, le tout dans un tableau
    required: [true, "A tour must have a name"],
    unique: true,
    trim: true,
    maxLength: [40, "A tour name must have less or equal than 40 characters"],
    minLength: [10, "A tour name must have more or equal to 10 characters"],
    // Commentée car n'accepte pas les espaces
    // validate: [validator.isAlpha, "Your name must be only letters"]
  },
  slug: String,
  duration: {
    type: Number,
    required: [true, "A tour must have a duration"]
  },
  maxGroupSize: {
    type: Number,
    required: [true, "A tour must have a group size"]
  },
  difficulty: {
    type: String,
    required: [true, "A tour must have a difficulty"],
    enum: {
      values: ["easy", "medium", "difficult"],
      message: "You should decide between easy, medium or difficult"
    }
  },
  ratingsAverage: {
    type: Number,
    default: 4.5,
    min: [1, "Rating must above 1"],
    max: [5, "Rating must below 5"],
    set: value => Math.round(value * 10) / 10
  },
  ratingsQuantity: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    required: [true, "A tour must have a price"]
  },
  priceDiscount: {
    type: Number,
    validate: {
      validator: function (val) {
        // Le this ne fonctionne que sur la création de documents et pas sur de l'update de documents.
        // Validator maison utilisable uniquement pour de la création de document
        return val < this.price
      },
      message: "Discount price ({VALUE}) should be below the regular price"
    }
  },
  summary: {
    type: String,
    trim: true,
    required: [true, "A tour must have a summary"]
  },
  description: {
    type: String,
    trim: true
  },
  imageCover: {
    type: String,
    required: [true, "A tour must have a imageCover"]
  },
  // Je veux un array de string pour stocker les images, je l'écris de la manière suivante :
  images: [String],
  createdAt: {
    type: Date,
    default: Date.now(),
    // Pour bloquer l'envoi/cacher de la propiété createdAt côté client
    select: false
  },
  // Je veux un array de dates, je l'écris de la manière suivante :
  startDates: [Date],
  secretTour: {
    type: Boolean,
    default: false
  },
  startLocation: {
    // GeoJSON
    type: {
      type: String,
      default: "Point",
      enum: ["Point"]
    },
    coordinates: [Number],
    address: String,
    description: String
  },
  locations: [
    {
      // GeoJSON
      type: {
        type: String,
        default: "Point",
        enum: ["Point"]
      },
      coordinates: [Number],
      address: String,
      description: String,
      day: Number
    }
  ],
  // Embed version
  // On va enregistrer toutes les infos du user que l'on recherche
  // guides: Array

  // Reference version
  // On va enregistrer uniquement les id et pas toutes les infos du user MAIS ensuite avec populate dans les controllers on ira chercher toutes les infos à envoyer dans la response. La différence est que l'on ne stocke dans le model que les id
  guides: [
    {
      type: mongoose.Schema.ObjectId,
      // Référence au model qui nous intéresse => va créer la jointure avec l'autre collection (ici User)
      // puis on populate (ligne 189) pour récuperer les données
      ref: "User"
    }
  ]
}, {
  // Si on veut utiliser virtual, il faut rajouter un objet en second argument du schema
  toJSON: { virtual: true },
  toObject: { virtual: true }
})



// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! OPTIMISATION !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// Super important pour optimiser la lecture des données en base. En posant index({ price: 1}), je dis à mongoDB de ranger par ordre croissant ou décroissant (-1) les documents en fonction du champs price. Cela va accélerer les recherches des utilisateurs si ces derniers recherchent/filtrent par price. Mais attention, il est déconseillé de se lâcher sur les index car les index utilisent aussi de la ressource. Donc il est conseillé de ne poser que les index qui paraissent partinents pour optimiser les recherches des utilisateurs : Quelles recherches les utilisateurs vont réaliser en nombre ? Ne pas oublier que cela concerne uniquement la lecture de certaines données
// Ne pas oublier d'aller supprimer les index dans compass si on change d'avis car les supprimer du code ne suffit pas
tourSchema.index({ price: 1, ratingsAverage: -1 })
tourSchema.index({ slug: 1 })

// Cet index est indispensable pour utiliser la géolocalisation avec mongoDB.
tourSchema.index({ startLocation: "2dsphere" })
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! OPTIMISATION !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!






// Virtual est proposé par mongoose pour créer des variables sans les stocker en BDD. Ces variables doivent être des variables qui découlent facilement d'une autre et qui n'ont donc pas besoin d'être stockées, comme calculer une distance de miles en km. Si on a stocké miles, pas besoin de stocker km..
// On ne peut pas utiliser les virtual avec des requêtes
// On ne peut pas utiliser une arrow function car on a besoin du this
tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7
})


// Virtual Populate permet de populate sans avoir à l'enregistrer concrètement dans la bdd. Ca nous permet d'éviter de poser un tableau d'ObjectId qui pourrait grandir à l'infini dans le model
// Dans l'object il faut préciser en détail les champs/documents qui nous intéressent => 
// foreignField = le champs/document présent (ici "tour") dans le model visé (ici review) où on stocke le ObjectId. Donc go le reviewModel regarder le champs/document "tour"
// localField = le champs/document présent (ici _id) dans le model d'origine (ici tour) pour l'envoyer au model visé (ici "review")
tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id"
})


// ------------------------- MONGOOSE DOCUMENT MIDDLEWARE -------------------------

// Mongoose DOCUMENT MIDDLEWARE: runs BEFORE only .save() and .create() methods
tourSchema.pre("save", function (next) {
  // On rajoute une propriété slug au model avant sa création (c'est un exemple, on aurait pu le faire dans le model..)
  this.slug = slugify(this.name, { lowercase: true })
  next()
})


// Mongoose DOCUMENT MIDDLEWARE: runs AFTER all middlewares
tourSchema.post("save", function (doc, next) {
  console.log("Mongoose POST Middleware", doc)
  next()
})

// SI on veut embed les guides dans le document tours
// Cela marchera uniquement pour la création, pas la modification (le guide veut changer son email..), pour la modificiation il faudra dupliquer la logique ailleurs
// Commentée car dans le cours on ne partira pas sur du embed mais referencing (dans une autre collection)

// tourSchema.pre("save", async function (next) {
//   // On stocke un tableau de promises
//   const guidesPromises = this.guides.map(id => await User.findById(id))
//   // On "extrait" les promises
//   this.guides = await Promise.all(guidesPromises)
//   next()
// })
// ------------------------- MONGOOSE DOCUMENT MIDDLEWARE -------------------------



// ------------------------- Query MIDDLEWARE -------------------------

// Query MIDDLEWARE
// identique au Document Middleware, la seule différence réside dans le "find" et non pas "save". Ca veut dire qu'on travaille sur la requête et pas le document
// Regular Expression pour matcher tous les types de requêtes avec find (find, findOne, findOneAndUpdate..)
tourSchema.pre(/^find/, function (next) {
  // On veut afficher les documents qui ont secretTour a false
  this.find({ secretTour: false })
  this.start = Date.now()
  next()
})

tourSchema.pre(/^find/, function (next) {
  // this points to the query
  this.populate({
    path: "guides",
    select: "-__v -passwordChangedAt"
  })
  next()
})

tourSchema.post(/^find/, function (docs, next) {
  console.log("QUERY POST Middleware", docs)
  console.log(`Query took ${Date.now() - this.start} milliseconds`)
  next()
})



// ------------------------- Query MIDDLEWARE -------------------------



// ------------------------- AGGREGATION MIDDLEWARE -------------------------

// Commenté car cela bug la fonction aggregate dans tourController ligne 156. Pour la géolocalisation on doit avoir $geoNear en premier dans le pipeline aggregate. Or avec ce middleware $geoNear est second.. donc pour parer au plus simple on a commenté mdr
// tourSchema.pre("aggregate", function (next) {
//   // On va ajouter au pipeline (les différentes étapes de l'aggregate) un traitement/étape, ici on veut les Tours qui ont secretTour à false
//   this.pipeline().unshift({ $match: { secretTour: false } })
//   next()
// })

// ------------------------- AGGREGATION MIDDLEWARE -------------------------





// Création d'un model à partir d'un schema, on précise le nom du model puis le nom du schema
const Tour = mongoose.model("Tour", tourSchema)





// // Création d'un document à partir du model, "instanciation du model"
// const testTour = new Tour({
//   name: "The Forest Hiker",
//   rating: 4.7,
//   price: 497
// })

// // Utilisation d'une méthode passée par mongoose (schema => model => document) pour sauvegarder le document dans la bdd. Tout seul comme un grand grâce aux méthodes passées par mongoose à chaque fois qu'on instancie
// testTour.save().then(document => {
//   console.log(document)
// }).catch(err => {
//   console.log(err)
// })

module.exports = Tour