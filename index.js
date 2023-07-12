const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const session = require("express-session");
const flash = require("express-flash");
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const saltRounds = 10;

// Set the view engine to use EJS
app.set("view engine", "ejs");

// Middleware setup
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());

// Create a MySQL connection pool
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "db_balnews",
});

// Middleware to check if the user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.admin) {
    return next();
  }
  req.flash("error", "Please log in to access this page.");
  res.redirect("/admin/login");
};

// Landing page
app.get("/", (req, res) => {
  db.query("SELECT * FROM news ORDER BY created_at DESC", (err, results) => {
    if (err) throw err;
    res.render("landing", { news: results.reverse() });
  });
});

// Routes setup
const adminRoutes = require("./routes/admin.routes");
app.use("/admin", adminRoutes);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
