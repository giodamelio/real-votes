'use strict';

const app = require('express')();
const morgan = require('morgan');
const mongoose = require('mongoose');

const pollRouter = require('../route/pollRouter');
const Promise = require('../lib/promise');

mongoose.Promise = Promise;

const mongoServer = 'mongodb://localhost/pollDatabase';
mongoose.connect(mongoServer);

app.use('/api/poll', pollRouter);
app.use(morgan('dev'));

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).send(err.message);
  next();
});

const port = 3141;
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});