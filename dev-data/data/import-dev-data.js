const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const Tour = require("../../models/tourModel")
const User = require("../../models/userModel")
const Review = require("../../models/reviewModel")

dotenv.config({ path: './config.env' });

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

// Read JSON file
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, "utf8"));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, "utf8"));
const reviews = JSON.parse(fs.readFileSync(`${__dirname}/reviews.json`, "utf8"));

// Import Data into Database
const importData = async () => {
  try {
    await Tour.create(tours)
    await User.create(users, { validateBeforeSave: false })
    await Review.create(reviews)
    console.log("Data loaded")
  } catch (error) {
    console.log(error);
  }
  process.exit()
}

// Delete all Data from Database
const deleteData = async () => {
  try {
    await Tour.deleteMany()
    await User.deleteMany()
    await Review.deleteMany()
    console.log("Data deleted")
  } catch (error) {
    console.log(error)
  }
  process.exit()
}

// Dans le terminal, je tape "node ./dev-data/data/import-dev-data.js --delete".
// 1 : node pour que node lise le script qui vient
// 2 : le nom du fichier car avec le terminal il ne veut pas aller directement dans le fichier, ce con s'arrête au dossier parent, pas trop grave en soit mais on précise donc le nom du fichier
// 3 : le "--delete" est en quelque sorte le troisième "argument" dans la ligne de commande et on y a accès avec "process.argv[2]". Le 2 fait référence à l'emplacement, comme il s'agit d'un tableau on compte à partir de 0..
// Pour importer : je tape "node ./dev-data/data/import-dev-data.js --import".
if (process.argv[2] === "--import") {
  importData()
} else if (process.argv[2] === "--delete") {
  deleteData()
}