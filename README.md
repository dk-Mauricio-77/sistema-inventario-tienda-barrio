
 🏪 Sistema de Inventario - Tienda de Barrio

📌 Descripción del Proyecto
Este es un sistema de inventario desarrollado para la gestión de productos en una tienda de barrio.
Permite llevar el control de entradas, salidas, stock, historial de movimientos y reportes en PDF, con roles diferenciados para administrador y empleados.

🚀 Funcionalidades principales

✅ Login seguro con validación de credenciales en base de datos.
✅ Gestión de productos (CRUD): registrar, editar, eliminar y listar productos.
✅ Control de inventario: registrar entradas y salidas de stock.
✅ Historial de movimientos: registro cronológico de todas las operaciones.
✅ Alertas de stock bajo con colores y notificaciones.
✅ Generación de reportes en PDF con inventario actualizado.
✅ Usabilidad mejorada con mensajes claros y confirmaciones.

🛠️ Tecnologías utilizadas

Frontend: HTML, CSS, JavaScript (o el framework que uses, ej. React).

Backend: Node.js / PHP / Python (especificar lo que usaste).

Base de datos: MySQL / PostgreSQL / SQLite.

Control de versiones: Git + GitHub.

Herramientas de QA: Postman, JMeter, Trello para gestión ágil.

📂 Estructura del Proyecto (ejemplo)
📦 sistema-inventario
 ┣ 📂 src
 ┃ ┣ 📂 controllers
 ┃ ┣ 📂 models
 ┃ ┣ 📂 routes
 ┃ ┗ 📂 views
 ┣ 📂 database
 ┃ ┗ schema.sql
 ┣ 📂 public
 ┃ ┣ 📂 css
 ┃ ┗ 📂 js
 ┣ .gitignore
 ┣ package.json (si es Node.js)
 ┣ README.md

⚙️ Instalación y ejecución

Clonar el repositorio:

git clone https://github.com/tuusuario/sistema-inventario-barrio.git
cd sistema-inventario-barrio


Instalar dependencias (si aplica, por ejemplo en Node.js):

npm install


Configurar la base de datos:

Importar schema.sql en MySQL/PostgreSQL.

Ajustar credenciales en .env.

Ejecutar el servidor:

npm start


Abrir en el navegador:

http://localhost:3000

📊 Metodología de desarrollo

Se utilizó Scrum con Sprints semanales.

Las historias de usuario y tareas fueron gestionadas en Trello.

Las pruebas funcionales y de rendimiento se realizaron con Postman y JMeter.

Se documentaron Casos de Prueba y Bug Reports en formato QA (Excel).
