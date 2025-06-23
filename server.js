const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const { db, db2 } = require('./server/db/db');

const app = express();
const PORT = 1708;

// הגדרות בסיסיות
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "style")));
app.use(express.static(path.join(__dirname, "images")));

// ניהול session (לא מצפין סיסמאות!)
app.use(session({
    secret: 'bank-secret-key',
    resave: false,
    saveUninitialized: false
}));

// דפי HTML
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get("/contactUs", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "contactUs.html"));
});

app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/signUp", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "signUp.html"));
});

// שליחת טופס צור קשר
app.post("/contactUs", (req, res) => {
    const { firstName, secondName, eMail, message } = req.body;

    db2.run(
        'INSERT INTO contact (firstName, secondName, eMail, message) VALUES (?, ?, ?, ?)',
        [firstName, secondName, eMail, message],
        function (err) {
            if (err) {
                console.error("Error inserting into database:", err.message);
                res.status(500).send("אירעה שגיאה בשמירת פרטיך");
            } else {
                res.send("פרטיך נשמרו בהצלחה, נחזור אליך בהקדם");
            }
        }
    );
});

// הרשמה
app.post("/signUp", (req, res) => {
    const { email, username, password } = req.body;

    db.run(
        'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
        [email, username, password],
        function (err) {
            if (err) {
                console.error("שגיאה בהרשמה:", err.message);
                res.status(500).send("שם המשתמש כבר קיים או שגיאה אחרת");
            } else {
                // שמירה בסשן של המשתמש החדש
                req.session.user = {
                    id: this.lastID,
                    username: username,
                    email: email
                };

                // מעבר לעמוד פרטי
                res.redirect("/account");
            }
        }
    );
});


// התחברות
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password],
        (err, user) => {
            if (err) {
                console.error("שגיאה במסד הנתונים:", err.message);
                return res.status(500).send("שגיאת שרת פנימית");
            }

            if (!user) {
                return res.send("שם משתמש או סיסמה לא נכונים");
            }

            // שמירה בסשן
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email
            };

            res.redirect("/account");
        }
    );
});



app.get("/account", (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    res.sendFile(path.join(__dirname, "public", "account.html"));
  });

  app.get('/api/userData', (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'משתמש לא מחובר' });
    }
  
    const userId = req.session.user.id;
  
    db.get('SELECT username, email, balance FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) return res.status(500).json({ error: 'שגיאה במסד הנתונים' });
      if (!row) return res.status(404).json({ error: 'משתמש לא נמצא' });
  
      res.json({
        username: row.username,
        email: row.email,
        balance: row.balance || 0
      });
    });
  });
  

app.get('/api/transactions', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'משתמש לא מחובר' });
  
    const userId = req.session.user.id;
  
    db.all(
      'SELECT amount, type, description, date FROM transactions WHERE userId = ? ORDER BY date DESC LIMIT 10',
      [userId],
      (err, rows) => {
        if (err) return res.status(500).json({ error: 'שגיאה בשליפת הפעולות' });
        res.json(rows);
      }
    );
  });
  
  
 
  
  app.post('/api/transaction', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'משתמש לא מחובר' });
  
    const userId = req.session.user.id;
    const { amount, type, description } = req.body;
  
    if (!amount || (type !== 'income' && type !== 'expense')) {
      return res.status(400).json({ error: 'נתונים לא תקינים' });
    }
  
    const signedAmount = type === 'income' ? amount : -amount;
  
    db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [signedAmount, userId], function (err) {
      if (err) return res.status(500).json({ error: 'שגיאה בעדכון היתרה' });
  
      // הוספת הפעולה לטבלת transactions
      db.run(
        'INSERT INTO transactions (userId, amount, type, description) VALUES (?, ?, ?, ?)',
        [userId, amount, type, description || 'ללא תיאור'],
        function (err2) {
          if (err2) return res.status(500).json({ error: 'שגיאה בשמירת הפעולה' });
  
          // החזרת היתרה החדשה
          db.get('SELECT balance FROM users WHERE id = ?', [userId], (err3, row) => {
            if (err3) return res.status(500).json({ error: 'שגיאה במסד הנתונים' });
            res.json({ balance: row.balance });
          });
        }
      );
    });
  });
  
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.send("שגיאה בהתנתקות");
        }
        res.redirect("/login");
    });
});

// הפעלת השרת
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
