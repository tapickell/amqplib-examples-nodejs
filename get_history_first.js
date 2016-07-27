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
        console.log("Gathering History");
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
        var queueName = process.argv.slice(2).join(' ');
        return ch.assertQueue(queueName, {exclusive: false});
      })
      .then(function(qok) {
        return ch.bindQueue(qok.queue, 'logs', '').then(function() {
          return qok.queue;
        });
      })
      .then(function(queue) {
        return ch.consume(queue, logMessage, {noAck: false});
      })
      .then(function() {
        console.log(' [*] Waiting for logs. To exit press CTRL+C');
      });

    function logMessage(msg) {
      console.log(" " + msg.fields.deliveryTag + " [x] " + msg.content.toString());
      ch.ack(msg);
    }

      function getAllMessages(queueName, acc) {
        return ch.get(queueName, {noAck: false})
          .then(function(msg) {
            if (msg) {
              acc.push(msg);
              return getAllMessages(queueName, acc);
            } else {
              console.log(" [H] Done gathering History");
              return acc;
            }
          });
      }
  });
}).then(null, console.warn);
