const mongoose = require('mongoose');
const dotenv = require('dotenv');

// On va gérer le cas d'une erreur "uncaught Rejection" lors par exemple d'un problème de code asynchrone
// On le pose tout en haut car il doit pouvoir attraper ce genre d'erreur avant que tout autre code soit lancé
process.on("uncaughtException", err => {
  console.log(err.name, ". ", err.message)
  // Dans ce cas de figure il faut poser le process.exit(1) pour nettoyer le code quoi qu'il arrive car node est "pollué" par les uncaught Rejection
  process.exit(1)
})

dotenv.config({ path: './config.env' });

const app = require('./app');

const DB = process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD)

mongoose.connect(DB, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true
}).then(connect => {
  // console.log(connect.connections);
  console.log("on est connecté Bébé")
})



const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// On va gérer le cas d'une erreur "unhandled Rejection" lors par exemple d'un problème de connexion à la BDD
process.on("unhandledRejection", err => {
  console.log(err.name, ". ", err.message)
  server.close(() => {
    // On ferme le server et APRES on arrête tout (process.exit(1))
    // Attention car ça veut dire qu'on arrête tout, il faut s'assurer que l'hébergeur s'occupe bien de redémarrer le server.. sinon vaut mieux ne pas poser le server.close..
    process.exit(1)
  })
})


