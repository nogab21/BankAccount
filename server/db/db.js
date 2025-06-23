const sqlite3 = require("sqlite3");
const path = require("path");
const db = new sqlite3.Database(path.join(__dirname, "users.db"));
const db2 = new sqlite3.Database(path.join(__dirname, "contact.db"));

console.log("db.js loaded");


db.serialize(()=> {
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )`);
})
db2.serialize(()=> {
    db2.run(`CREATE TABLE IF NOT EXISTS contact (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    secondName TEXT NOT NULL UNIQUE,
    eMail TEXT NOT NULL,
    message TEXT NOT NULL
  )`);
})

db.run(`CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL, -- 'income' או 'expense'
  description TEXT,
  date TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
)`);


module.exports = {db, db2};
