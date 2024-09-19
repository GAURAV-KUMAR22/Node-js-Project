
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const campression = require('compression');
const errorController = require('./controllers/error');
const User = require('./models/user');


const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}%40@node.gzezwi7.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;
const PORT = process.env.PORT;
const app = express();
const store = new MongoDBStore({

  uri: MONGODB_URI,
  collection: 'sessions'
});

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});


app.use(helmet());
app.use(campression());
const csrfProtection = csrf();
const privateKey = fs.readFileSync('server.key');
const certificate = fs.readFileSync('server.cert');
app.set('view engine', 'ejs');
app.set('views', 'views');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const { error } = require("console");
const { keyBag, certBag } = require('node-openssl-cert/name_mappings');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage }).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
  session({
    secret: 'my secret',
    resave: true,
    saveUninitialized: true,
    store: store
  })
);
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();

  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});


app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

app.use((req, res, next) => {
  res.status(error.httpStatusCode);
  res.redirect('/500');
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
});

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(result => {
    // https.createServer({ keyBag: privateKey, certBag: certificate }, app).listen(PORT, () => console.log('server', PORT));
    app.listen(PORT, () => console.log('server', PORT));
  })
  .catch(err => {
    throw new Error("server does not connect at this Time");
  });
