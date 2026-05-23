const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GMAIL_PASS loaded:', !!process.env.GMAIL_PASS);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

async function sendMeetingInvite(attendee, meeting) {
  const subject = `Meeting Invite: ${meeting.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; 
         margin: 0 auto; background: #f9f9f9; padding: 24px; 
         border-radius: 10px;">
      <h2 style="color: #1F3864;">📅 Meeting Invitation</h2>
      <p>Hi <b>${attendee.name}</b>,</p>
      <p>You have been invited to a meeting.</p>
      <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <tr>
          <td style="padding:8px; color:#666;">Meeting</td>
          <td style="padding:8px;"><b>${meeting.title}</b></td>
        </tr>
        <tr style="background:#f0f0f0;">
          <td style="padding:8px; color:#666;">Goal</td>
          <td style="padding:8px;">${meeting.meetingGoal}</td>
        </tr>
        <tr>
          <td style="padding:8px; color:#666;">Date & Time</td>
          <td style="padding:8px;">
            <b>${new Date(meeting.date).toLocaleString()}</b>
          </td>
        </tr>
        <tr style="background:#f0f0f0;">
          <td style="padding:8px; color:#666;">Duration</td>
          <td style="padding:8px;">${meeting.duration} minutes</td>
        </tr>
        ${meeting.meetingType === 'online' ? `
        <tr>
          <td style="padding:8px; color:#666;">Platform</td>
          <td style="padding:8px;">${meeting.platform}</td>
        </tr>
        ${meeting.meetingLink ? `
        <tr style="background:#f0f0f0;">
          <td style="padding:8px; color:#666;">Meeting Link</td>
          <td style="padding:8px;">
            <a href="${meeting.meetingLink}" 
               style="color:#2E75B6;">
               Click to Join
            </a>
          </td>
        </tr>` : ''}` : `
        <tr>
          <td style="padding:8px; color:#666;">Venue</td>
          <td style="padding:8px;">${meeting.venue || 'TBD'}</td>
        </tr>`}
        ${meeting.agenda ? `
        <tr>
          <td style="padding:8px; color:#666; vertical-align:top;">
            Agenda
          </td>
          <td style="padding:8px; white-space:pre-line;">
            ${meeting.agenda}
          </td>
        </tr>` : ''}
      </table>
      <p style="margin-top:24px; color:#888; font-size:13px;">
        This invite was sent by AI Meeting Assistant
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"AI Meeting Assistant" <${process.env.GMAIL_USER}>`,
    to: attendee.email,
    subject,
    html
  });
}

async function sendReminderEmail(attendee, meeting, reminderType) {
  const timeLabels = {
    oneDay: 'tomorrow',
    oneHour: 'in 1 hour',
    fifteenMin: 'in 15 minutes'
  };

  const subject = `Reminder: ${meeting.title} starts ${timeLabels[reminderType]}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; 
         margin: 0 auto; background: #f9f9f9; padding: 24px; 
         border-radius: 10px;">
      <h2 style="color: #1F3864;">⏰ Meeting Reminder</h2>
      <p>Hi <b>${attendee.name}</b>,</p>
      <p>Your meeting <b>${meeting.title}</b> starts 
         <b>${timeLabels[reminderType]}</b>.</p>
      <p><b>Date:</b> ${new Date(meeting.date).toLocaleString()}</p>
      ${meeting.meetingLink ? `
      <p>
        <a href="${meeting.meetingLink}" 
           style="background:#2E75B6; color:white; padding:10px 20px; 
                  border-radius:6px; text-decoration:none;">
          Join Meeting
        </a>
      </p>` : ''}
      <p style="margin-top:24px; color:#888; font-size:13px;">
        AI Meeting Assistant
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"AI Meeting Assistant" <${process.env.GMAIL_USER}>`,
    to: attendee.email,
    subject,
    html
  });
}

async function sendMeetingInvite(attendee, meeting, attendanceToken) {
  const baseUrl = process.env.APP_URL || 
                  'http://localhost:5000';
  const joinLink = `${baseUrl}/api/attendance/join/${attendanceToken}`;

  const subject = `Meeting Invite: ${meeting.title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; 
         margin: 0 auto; background: #f9f9f9; padding: 24px; 
         border-radius: 10px;">
      <h2 style="color: #1F3864;">📅 Meeting Invitation</h2>
      <p>Hi <b>${attendee.name}</b>,</p>
      <p>You have been invited to a meeting.</p>
      <table style="width:100%; border-collapse:collapse; 
                    margin-top:16px;">
        <tr>
          <td style="padding:8px; color:#666;">Meeting</td>
          <td style="padding:8px;"><b>${meeting.title}</b></td>
        </tr>
        <tr style="background:#f0f0f0;">
          <td style="padding:8px; color:#666;">Goal</td>
          <td style="padding:8px;">${meeting.meetingGoal}</td>
        </tr>
        <tr>
          <td style="padding:8px; color:#666;">Date & Time</td>
          <td style="padding:8px;">
            <b>${new Date(meeting.date).toLocaleString()}</b>
          </td>
        </tr>
        <tr style="background:#f0f0f0;">
          <td style="padding:8px; color:#666;">Duration</td>
          <td style="padding:8px;">${meeting.duration} minutes</td>
        </tr>
        ${meeting.meetingLink ? `
        <tr>
          <td style="padding:8px; color:#666;">Meeting Link</td>
          <td style="padding:8px;">
            <a href="${meeting.meetingLink}">Click to Join</a>
          </td>
        </tr>` : ''}
        ${meeting.agenda ? `
        <tr>
          <td style="padding:8px; color:#666; vertical-align:top;">
            Agenda
          </td>
          <td style="padding:8px; white-space:pre-line;">
            ${meeting.agenda}
          </td>
        </tr>` : ''}
      </table>

      <div style="margin-top:24px; text-align:center;">
        <a href="${joinLink}" 
           style="display:inline-block;
                  background:#c9a84c; 
                  color:#000000; 
                  padding:14px 32px; 
                  border-radius:8px; 
                  text-decoration:none; 
                  font-weight:bold;
                  font-size:15px;
                  line-height:1.4;
                  white-space:nowrap;
                  font-family:Arial,sans-serif;">
          ✅ Mark Attendance &amp; Join Meeting
        </a>
      </div>

      <p style="margin-top:12px; 
                text-align:center;
                color:#888888; 
                font-size:12px;
                font-family:Arial,sans-serif;">
        Clicking the button above will mark your 
        attendance and redirect you to the meeting.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"AI Meeting Assistant" <${process.env.GMAIL_USER}>`,
    to: attendee.email,
    subject,
    html
  });
}

module.exports = { sendMeetingInvite, sendReminderEmail };