const crypto = require("crypto");
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name"]
  },
  email: {
    type: String,
    required: [true, "Please tell us your email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid email"]
  },
  photo: {
    type: String,
    default: "default.jpg"
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead", "admin"],
    default: "user"
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minLength: 8,
    select: false
  },
  passwordConfirmation: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      // Fonctionne UNIQUEMENT avec User.create() ou lors d'un User.save()
      validator: function (item) {
        return item === this.password
      }
      ,
      message: "Passwords are different !"
    },
    select: false
  },
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }

})

userSchema.pre("save", async function (next) {
  // On s'assure que la fonction va s'exécuter uniquement si le password est modifié, sinon on sort de la function
  if (!this.isModified("password")) return next()

  this.password = await bcrypt.hash(this.password, 12)
  // En mettant null on garantit qu'on ne sauvegardera pas en BDD l'input de l'utilisateur. Même si c'est un champs required ça passe car l'utilisateur a rentré quelque chose, c'est nous qui posons null juste après
  this.passwordConfirmation = null
  next()
})



// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// Quand on crée/accroche une méthode à un schema, on y a accès partout où on require ce schema. Typiquement ici dans le fichier authController on va require userSchema donc on aura accès aux fonctions ci-dessous
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!



userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew) return next()

  // Il peut y avoir un léger bug : l'écriture en bdd de nouveau password plus lent que la production du token avec à la clé l'impossibilité parfois de se connecter donc on va réduire de 1 seconde la date du changement de password
  this.passwordChangedAt = Date.now() - 1000

  next()
})

userSchema.pre(/^find/, function (next) {
  // Il va afficher uniquement les documents avec la propriété active à true (ici les users)
  this.find({ active: { $ne: false } })
  next()
})


userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  // On ne peut pas utiliser this ici car on a mis password select: false dans le model donc la propriété password du model n'est pas accessible avec le this
  // On a besoin de la methode compare de bcrypt car candidatePassword est hashé
  return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10)

    // True or false
    return JWTTimestamp < changedTimestamp
  }

  // False veut dire inchangé
  return false
}

userSchema.methods.createPasswordResetToken = function () {
  // crypto est un module interne à nodejs qui permet de donner un nombre aléatoire et de le chiffrer après coup, il suffit de l'appeler tout en haut. Ici non chiffré
  const resetToken = crypto.randomBytes(32).toString('hex')

  // On va sauvegarder dans la bdd la version chiffrée
  this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex")

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000

  // On va envoyer la version non chiffrée par email qui sera comparée à la version chiffrée dans la bdd
  return resetToken
}

const User = mongoose.model('User', userSchema)

module.exports = User