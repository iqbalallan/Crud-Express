const express = require("express");
const router = express.Router();
const mysql = require("mysql");
const bcrypt = require("bcrypt");
const saltRounds = 10;

// Koneksi ke database
const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "db_balnews",
});

// Middleware untuk cek apakah admin sudah login
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.admin) {
    return next();
  }
  req.flash("error", "Please log in to access this page.");
  res.redirect("/admin/login");
};

// Admin login page
router.get("/login", (req, res) => {
  res.render("login");
});

// Handle admin login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.query(
    "SELECT * FROM admin WHERE username = ?",
    [username],
    (err, results) => {
      if (err) throw err;
      if (results.length > 0) {
        const admin = results[0];
        bcrypt.compare(password, admin.password, (err, isMatch) => {
          if (err) throw err;
          if (isMatch) {
            req.session.admin = admin;
            res.redirect("/admin");
          } else {
            req.flash("error", "Invalid username or password.");
            res.redirect("/admin/login");
          }
        });
      } else {
        req.flash("error", "Invalid username or password.");
        res.redirect("/admin/login");
      }
    }
  );
});

// Render dashboard page
router.get("/", (req, res) => {
  // Retrieve the admin data from the session or database
  const admin = req.session.admin; // or retrieve from the database using req.session.adminId

  if (!admin) {
    // Redirect to the login page if the admin is not logged in
    return res.redirect("/admin/login");
  }

  // Retrieve the news data from the database
  db.query("SELECT * FROM news ORDER BY created_at ASC", (err, results) => {
    if (err) throw err;

    // Render the dashboard template with the admin and news data
    res.render("dashboard", {
      admin: admin,
      news: results,
      successMessage: req.flash("successMessage"),
      errorMessage: req.flash("successMessage"),
    });
  });
});

// Add news form
router.get("/add", isAuthenticated, (req, res) => {
  res.render("add-news");
});

// Handle news submission
router.post("/add", isAuthenticated, (req, res) => {
  const { title, content, author } = req.body;
  db.query(
    "INSERT INTO news (title, content, author) VALUES (?, ?, ?)",
    [title, content, author],
    (err, results) => {
      if (err) throw err;
      req.flash("success", "News added successfully.");
      res.redirect("/admin");
    }
  );
});

// Edit news form
router.get("/edit/:id", isAuthenticated, (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM news WHERE id = ?", [id], (err, results) => {
    if (err) throw err;
    if (results.length > 0) {
      res.render("edit-news", { news: results[0] });
    } else {
      req.flash("error", "News not found.");
      res.redirect("/admin");
    }
  });
});

// Handle news update
router.post("/edit/:id", isAuthenticated, (req, res) => {
  const { id } = req.params;
  const { title, content, author } = req.body;
  db.query(
    "UPDATE news SET title = ?, content = ?, author = ? WHERE id = ?",
    [title, content, author, id],
    (err, results) => {
      if (err) throw err;
      req.flash("success", "News updated successfully.");
      res.redirect("/admin");
    }
  );
});

// Delete news
router.get("/delete/:id", isAuthenticated, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM news WHERE id = ?", [id], (err, results) => {
    if (err) throw err;
    req.flash("success", "News deleted successfully.");
    res.redirect("/admin");
  });
});

// Admin logout
router.post("/logout", isAuthenticated, (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});

// Register new admin
router.post("/register", (req, res) => {
  const { username, password } = req.body;

  // Check if username is already taken
  db.query(
    "SELECT * FROM admin WHERE username = ?",
    [username],
    (err, results) => {
      if (err) throw err;

      if (results.length > 0) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Hash and salt the password
      bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) throw err;

        // Insert the new admin into the database
        db.query(
          "INSERT INTO admin (username, password) VALUES (?, ?)",
          [username, hashedPassword],
          (err, results) => {
            if (err) throw err;

            return res.status(200).json({ message: "Registration successful" });
          }
        );
      });
    }
  );
});

module.exports = router;
