#!/usr/bin/env node

var amqp = require('amqplib');

amqp.connect('amqp://localhost').then(function(conn) {
  process.once('SIGINT', function() { conn.close(); });
  return conn.createChannel().then(function(ch) {
    return ch.assertExchange('logs', 'fanout', {durable: true})
      .then(function() {
        var queueName = 'history';
        return ch.assertQueue(queueName, {exclusive: false});
      })
      .then(function(qok) {
        console.log("QOK: " + JSON.stringify(qok));
        return getAllMessages(qok.queue, []);
      })
      .then(function(messages) {
        if (messages.length > 0) {
          messages.forEach(function(msg) {
            console.log(" " + msg.fields.deliveryTag + " [H] " + msg.content.toString());
          });
        } else {
          console.log("logMessage: " + "No Messages In History At This Time.");
        }
      })
      .then(function() {
        console.log(' [C] Closing Connection');
      });

      function getAllMessages(queueName, acc) {
        return ch.get(queueName, {noAck: false})
          .then(function(msg) {
            console.log("ch.get called in recursion " + JSON.stringify(msg));
            if (msg) {
              acc.push(msg);
              return getAllMessages(queueName, acc);
            } else {
              console.log("Done now returning accumulator");
              return acc;
            }
          });
      }
  });
}).then(null, console.warn);
