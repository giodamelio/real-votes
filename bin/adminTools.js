#!/usr/bin/env node
'use strict';

const request = require('request');
const vorpal = require('vorpal');
const prettyjson = require('prettyjson');
const Pie = require('cli-pie');
const mongoose = require('mongoose');
const randomcolor = require('randomcolor');
const EventSource = require('eventsource');

const User = require('../model/user');

// const PollBaseUrl = 'https://real-votes.herokuapp.com/api/poll';
const PollBaseUrlTest = 'http://localhost:3141/api/poll/';
const VoteBaseUrlTest = 'http://localhost:3141/api/vote/';

const mongoServer = process.env.MONGODB_URI || 'mongodb://localhost/pollDatabase';
mongoose.connect(mongoServer);

console.log('Hello welcome to the real-votes admin console.');

const cli = vorpal();

cli
  .command('addPoll', 'Creates a new poll')
  .action(function(args, callback) {
    this.prompt([
      {
        type: 'input',
        name: 'pollName',
        message: 'What would you like to name your poll? ',
      },
      {
        type: 'input',
        name: 'choices',
        message: 'Please enter your choices for this poll: ',
      },
      {
        type: 'input',
        name: 'votesPerUser',
        message: 'Please enter your max votes for this poll: ',
      },
    ], (answers) => {
      const options = {
        url: PollBaseUrlTest,
        json: {
          pollName: answers.pollName,
          choices: answers.choices.split(','),
          votesPerUser: answers.votesPerUser,
        },
        auth: {
          username: 'admin',
          password: process.env.PASSWORD,
        },
      };

      request.post(options, (err) => {
        if (err) return this.log(err);
        this.log('Success!');
        callback();
      });
    });
  });

cli
  .command('updatePollStatus', 'Updates the status of a poll')
  .action(function(args, callback) {
    this.prompt([
      {
        type: 'input',
        name: 'id',
        message: 'Please enter the polls id you want to update: ',
      },
      {
        type: 'input',
        name: 'pollStatus',
        message: 'Please enter the status you want to set: ',
      },
    ], (answers) => {
      const options = {
        url: PollBaseUrlTest + answers.id,
        json: { pollStatus: answers.pollStatus },
        auth: {
          username: 'admin',
          password: process.env.PASSWORD,
        },
      };

      request.put(options, (err) => {
        if (err) return this.log(err);
        this.log('Success!');
        callback();
      });
    });
  });

cli
  .command('addTestVote', 'Adds a test vote to specified poll')
  .action(function(args, callback) {
    this.prompt([
      {
        type: 'input',
        name: 'pollId',
        message: 'Please enter the polls id you want to update: ',
      },
      {
        type: 'input',
        name: 'userNumber',
        message: 'Please enter the phone number you want to use: ',
      },
      {
        type: 'input',
        name: 'vote',
        message: 'Please enter your vote: ',
      },
    ], (answers) => {
      const user = new User();
      user.phoneNumber = answers.userNumber;
      user.pollId = answers.pollId;
      user.vote = [answers.vote];
      user.save();
      callback();
    });
  });

cli
  .command('viewAllPolls', 'Shows all polls')
  .action(function(args, callback) {
    request.get(PollBaseUrlTest, (err, res, body) => {
      if (err) return this.log(err);
      this.log(prettyjson.render(JSON.parse(body)));
      callback();
    });
  });

function renderTally(results) {
  const chart = new Pie(10, [], { legend: true });

  const colorPalette = randomcolor({
    format: 'rgbArray',
    seed: results.seed,
    count: results.choices.length,
  });

  results.choices.forEach((choice, index) => {
    chart.add({
      label: choice,
      value: results.votes[choice] || 0,
      color: colorPalette[index],
    });
  });

  return chart.toString();
}

cli
  .command('showResults', 'Show the results of the current poll')
  .action(function(args, callback) {
    request.get(`${VoteBaseUrlTest}tally`, (err, res, body) => {
      if (err) return this.log(err);
      const results = JSON.parse(body);
      this.log(renderTally(results));
      callback();
    });
  });

cli
  .command(
    'showRealtimeResults',
    'Show the results of the current poll and keep them updated in real time'
  )
  .action(function() {
    // Get the initial tally
    request.get(`${VoteBaseUrlTest}tally`, (err, res, body) => {
      if (err) return this.log(err);
      const results = JSON.parse(body);
      process.stdout.write('\u001bc');
      this.log(renderTally(results));
    });

    // Subscribe to tally updates
    const es = new EventSource(`${VoteBaseUrlTest}tally/stream`);

    es.addEventListener('message', (e) => {
      const data = JSON.parse(e.data);
      if (data === 'heartbeat') return;

      // Clear the console
      process.stdout.write('\u001bc');
      this.log(renderTally(JSON.parse(data)));
    }, false);
  });

cli
  .delimiter('real-votes-admin$ ')
  .show();
