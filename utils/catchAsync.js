
// On créé une fonction dont le but est de prendre en charge tous les blocs catch (err) {} pour réduire la place prise par le bloc catch dans toutes les autres fonctions ayns/await. Du coup plus besoin de try/catch si on utilise la fonction catchAsync. Attention néanmoins car cela nous oblige à renvoyer le résultat de la fonction async en tant que fonction anonyme dans la fonction catchAsync. Un peu tiré par les cheveux mais si ça évite du code redondant...
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(err => next(err))
  }
}