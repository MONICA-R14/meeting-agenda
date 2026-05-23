const cron = require('node-cron');
const Schedule = require('../models/Schedule');
const { sendReminderEmail } = require('./mailer');

function startReminderCron() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const meetings = await Schedule.find({ status: 'scheduled' });

      for (const meeting of meetings) {
        const diff = (meeting.date - now) / 1000 / 60;

        // 1 day reminder
        if (diff >= 1439 && diff <= 1441 
            && !meeting.remindersSent.oneDay) {
          for (const attendee of meeting.attendees) {
            await sendReminderEmail(attendee, meeting, 'oneDay');
          }
          meeting.remindersSent.oneDay = true;
          await meeting.save();
        }

        // 1 hour reminder
        if (diff >= 59 && diff <= 61 
            && !meeting.remindersSent.oneHour) {
          for (const attendee of meeting.attendees) {
            await sendReminderEmail(attendee, meeting, 'oneHour');
          }
          meeting.remindersSent.oneHour = true;
          await meeting.save();
        }

        // 15 min reminder
        if (diff >= 14 && diff <= 16 
            && !meeting.remindersSent.fifteenMin) {
          for (const attendee of meeting.attendees) {
            await sendReminderEmail(attendee, meeting, 'fifteenMin');
          }
          meeting.remindersSent.fifteenMin = true;
          await meeting.save();
        }
      }
    } catch (err) {
      console.log('Cron error:', err.message);
    }
  });

  console.log('✅ Reminder cron started');
}

module.exports = { startReminderCron };