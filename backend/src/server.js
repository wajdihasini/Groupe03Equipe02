// Point d'entrée : démarre le serveur HTTP et la tâche de libération des réservations expirées.
// Architecture MVC : models/ (accès aux données Firestore), controllers/ (logique de chaque route),
// routes/ (URL -> middlewares -> contrôleur) ; la « vue » est la réponse JSON affichée par le frontend React.
import "dotenv/config";
import app from "./app.js";
import { expirePending } from "./controllers/orderController.js";

setInterval(expirePending, 60000);
expirePending();

const port = process.env.PORT || 4000;
app.listen(port, () => console.log("API CampusSave sur le port", port));
