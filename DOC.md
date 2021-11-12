MDP pour les users en BDD = test1234 sauf pour flo@flo.com = 12345678

Quand on déploie sur heroku:
  - heroku utilise la commande npm start pour lancer le projet donc il faut enlever "nodemon" de la commande
  - il faut ajouter au package.json
    "engines": {
      "node": ">=14"
    }



Function pour de l'import de data depuis un fichier JSON en local présent dans :
dev-data => data => import-dev-data.js 

Il faut le fichier JSON, le fichier import-dev-data?js ET config.env au même niveau pour lancer la function d'import. Pour lancer cette fonction, il faudra passer par le terminal et la commande :
node import-dev-data.js --import => import des datas
node import-dev-data.js --delete => suppression des datas


Comment "filtrer" des requêtes :
```js
exports.getAllTours = async (req, res) => {
  try {
    // BUILD QUERY 
    // Façon sans Classe


    // -----------------------------------
    // Pour la version avec classe, go regarder tourController.js
    // -----------------------------------



    // // 1a Filtering
    // // Pour filtrer, on va récupérer dans la requête url la partie liée au filtrage
    // // On va en faire une copie
    // const queryObj = { ...req.query }
    // // On veut supprimer les mots clés suivant du filtre car ils ne sont pas pertinents pour filtrer et risquent de bugger
    // const excludedFields = ["page", "sort", "limit", "fields"]
    // // On supprime du filtre les mots clés qui posent problème
    // excludedFields.forEach(field => delete queryObj[field])

    // // 1b Advanced filtering
    // // On construit le filtre
    // let queryStr = JSON.stringify(queryObj)
    // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`)

    // let query = Tour.find(JSON.parse(queryStr))


    // 2 Sorting
    // Si dans la requête on a un sort, on va modifier le query au-dessus construit sur un filter SANS sort. Ce n'est pas un problème de l'enlever au-dessus pour retravailler dessous, on part d'un traitement générique vers le plus spécifique et de toute façon le spécifique est toujours présent dans la requête
    // On peut filtrer avec plusieurs paramètres rentrés dans la requête (c'est à dire que côté client dans l'url on aura un truc du genre ?sort=price.ratingsAverage.name) dans l'url les paramètres de filtrage sont collés par un point car on ne peut pas avoir d'espace dans l'url et côté back on les reçoit dans la response liés par des points alors que on doit les enchainer avec des espaces pour pouvoir travailler avec la méthode sort() proposée par mongoose (example : sort("price ratingsAverage name"), d'où le split + join.
    // En résumé :
    // Front = req.query.sort collé par un point dans l'url envoyé au back 
    // Back = on récupère le req.query.sort, on enlève les points pour avoir des espaces pour utiliser la méthode sort() proposée par mongoose
    // if (req.query.sort) {
    //   const sortBy = req.query.sort.split(".").join(" ")
    //   query = query.sort(sortBy)
    // } else {
    //   // On pose un sort par défaut
    //   query = query.sort("-createdAt")
    // }


    // 3 Field Limiting
    // Comment limiter les datas que l'on envoie dans la réponse avec le paramètre fields :
    // Poser les "fields" souhaités dans l'url côté front, séparés par un point, pour l'avoir dans la req.query.fields (ex: localhost:3000/api/v1/tours?fields=name.duration)
    // select(), méthode proposée par mongoose nécessite les paramètres espacés par un espace, comme sort(), pour envoyer uniquement les fields reçus dans la requête en retour au client.
    // A noter que si on met un "-" devant le nom d'une propriété, elle ne sera pas envoyée
    // On peut bloquer l'envoi d'une donnée à la source depuis le schema en mettant la propriété "select:false" par exemple à "password"
    // if (req.query.fields) {
    //   console.log(req.query.fields)
    //   const fields = req.query.fields.split(".").join(" ")
    //   query = query.select(fields)
    // } else {
    //   // Par défaut on ne veut pas envoyer la data "__v"
    //   query = query.select("-__v")
    // }


    // 4 Pagination
    // page=2&limit=10 veut dire que la page 2 commence à 11 jusqu'à 20 donc si je veux atteindre la page 2, un moyen est d'utiliser les méthodes skip() et limit()

    // we want by default :
    // page 1 or the page selected by the client converted into number as we receive a string from the client
    // limit 100 if not given by the client with the conversion to number 
    // const page = req.query.page * 1 || 1
    // const limit = req.query.limit * 1 || 100
    // const skip = (page - 1) * limit

    // query = query.skip(skip).limit(limit)

    // // On gère le cas où le client veut aller au-delà du nombre de page existant
    // if (req.query.page) {
    //   const numTours = await Tour.countDocuments()
    //   if (skip >= numTours) throw new Error("This page does not exist")
    // }

    // On exécute le filtrage
    // Façon sans Classe
    // const tours = await query

    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        tours
      }
    });
  } catch (err) {
    res.status(401).json({
      status: 'error',
      message: err
    })
  }
};

```


Pour la fonction aggregate de mongodb, voire tourController.js

```js
exports.getTourStats = async (req, res) => {
  try {
    // La fonction aggregate nous permet de traiter une requête en différentes étapes sur tous les Models(éléments) Tour. C'est à dire de faire du travail de statistiques comme moyenne, min, max etc.. sur plusieurs objets facilement
    const stats = await Tour.aggregate([
      // une étape d'exemple
      {
        // l'aggrégateur de l'étape, on veut matcher les ratingsAverage égaux ou supérieur à 4.5
        $match: { ratingsAverage: { $gte: 4.5 } }
      },
      // autre étape importante : elle définit comment on regroupe les résultats de l'aggregate avec $group
      // Avec _id: null, on va réaliser nos étapes sur tous les éléments globalement
      // Avec _id: "difficulty", on va réaliser nos étapes en triant tous les éléments par difficultés
      {
        $group: {
          _id: "$difficulty",
          numTours: { $sum: 1 },
          numRatings: { $sum: "$ratingsQuantity" },
          avgRating: { $avg: "$ratingsAverage" },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" }
        }
        ,
      // On va sort, on doit utiliser les clés de propriétés utilisées dans $group au-dessus
      // avgPrice:1 veut dire du - au + cher
      {
        $sort: { avgPrice: 1 }
      },
      // On peut répéter les étapes
      // Ici on exclut les Tours "easy"
      {
        $match: {
          _id: { $ne: "easy" }
        }
      }
    ])
  

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: err
    })
  }
}

```