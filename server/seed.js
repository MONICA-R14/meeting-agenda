require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Meeting = require('./models/Meeting');
const Team = require('./models/Team');
const Schedule = require('./models/Schedule');

const SALT_ROUNDS = 10;

async function seed() {
  try {
    // ── Connect ──────────────────────────────────────────────────────────────
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');

    // ── Clear existing data ──────────────────────────────────────────────────
    console.log('\nClearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Meeting.deleteMany({}),
      Team.deleteMany({}),
      Schedule.deleteMany({})
    ]);
    console.log('All collections cleared.');

    // ── Users ────────────────────────────────────────────────────────────────
    console.log('\nCreating users...');
    const hashedPassword = await bcrypt.hash('Test@123', SALT_ROUNDS);

    const [monica, ravi, priya] = await User.insertMany([
      { name: 'Monica Raja', email: 'monica@meetai.com', password: hashedPassword },
      { name: 'Ravi Kumar',  email: 'ravi@meetai.com',  password: hashedPassword },
      { name: 'Priya Singh', email: 'priya@meetai.com', password: hashedPassword }
    ]);
    console.log(`Created 3 users: ${monica.name}, ${ravi.name}, ${priya.name}`);

    // ── Teams ────────────────────────────────────────────────────────────────
    console.log('\nCreating teams...');
    const [marketingTeam, salesTeam, devTeam] = await Team.insertMany([
      {
        name: 'Marketing Team',
        description: 'Handles all marketing campaigns, brand strategy, and digital outreach',
        createdBy: monica._id,
        members: [
          { name: 'Monica Raja', email: 'monica@meetai.com', role: 'admin' },
          { name: 'Ravi Kumar',  email: 'ravi@meetai.com',  role: 'member' },
          { name: 'Priya Singh', email: 'priya@meetai.com', role: 'member' },
          { name: 'John Mathew', email: 'john@meetai.com',  role: 'member' },
          { name: 'Sara Thomas', email: 'sara@meetai.com',  role: 'member' }
        ]
      },
      {
        name: 'Sales Team',
        description: 'Manages client acquisition, account management, and revenue targets',
        createdBy: monica._id,
        members: [
          { name: 'Ravi Kumar',   email: 'ravi@meetai.com',  role: 'admin' },
          { name: 'Priya Singh',  email: 'priya@meetai.com', role: 'member' },
          { name: 'Alex Fernandez', email: 'alex@meetai.com', role: 'member' },
          { name: 'Tom Wilson',   email: 'tom@meetai.com',   role: 'member' }
        ]
      },
      {
        name: 'Development Team',
        description: 'Responsible for product engineering, architecture, and technical delivery',
        createdBy: monica._id,
        members: [
          { name: 'Monica Raja', email: 'monica@meetai.com', role: 'admin' },
          { name: 'Priya Singh', email: 'priya@meetai.com', role: 'member' },
          { name: 'Dev One',     email: 'dev1@meetai.com',  role: 'member' },
          { name: 'Dev Two',     email: 'dev2@meetai.com',  role: 'member' },
          { name: 'Dev Three',   email: 'dev3@meetai.com',  role: 'member' }
        ]
      }
    ]);
    console.log(`Created 3 teams: ${marketingTeam.name}, ${salesTeam.name}, ${devTeam.name}`);

    // ── Meetings ─────────────────────────────────────────────────────────────
    console.log('\nCreating meetings...');
    await Meeting.insertMany([
      {
        userId: monica._id,
        goal: 'Q1 Sales Performance Review with regional managers',
        attendees: 'Monica, Ravi, Priya, John',
        duration: 60,
        agenda: '1. Q1 Revenue Analysis - 15 mins\n2. Regional Performance - 20 mins\n3. Action Planning - 25 mins',
        notes: 'Revenue dropped by 10 percent in southern region. Ravi confirmed new client pipeline is strong with 15 prospects. Priya suggested increasing digital marketing budget by 20 percent. John will prepare detailed regional report by next Friday. Team agreed to focus on enterprise clients this quarter. Next meeting scheduled for end of month.',
        summary: 'Q1 review revealed 10% revenue decline in southern region with strong pipeline of 15 new prospects offsetting concerns.',
        keyDecisions: ['Increase digital marketing budget by 20%', 'Focus on enterprise clients', 'Monthly review meetings'],
        actionItems: [
          { task: 'Prepare regional sales report', assignee: 'John', deadline: 'Next Friday', completed: false },
          { task: 'Increase digital marketing budget proposal', assignee: 'Priya', deadline: 'This week', completed: true },
          { task: 'Contact top 5 enterprise prospects', assignee: 'Ravi', deadline: 'End of month', completed: false }
        ],
        nextMeetingTopics: ['Enterprise client updates', 'Marketing budget review', 'Q2 targets']
      },
      {
        userId: monica._id,
        goal: 'Product roadmap planning for Q2 with development leads',
        attendees: 'Monica, Dev1, Dev2, Dev3',
        duration: 90,
        agenda: '1. Current Sprint Review - 20 mins\n2. Q2 Feature Planning - 40 mins\n3. Resource Allocation - 30 mins',
        notes: 'Sprint 12 completed with 90 percent velocity. Three major features planned for Q2 including AI integration, mobile app, and dashboard redesign. Dev1 raised concerns about technical debt that needs addressing. Dev2 confirmed mobile app can be delivered in 8 weeks. Monica approved additional contractor budget for the quarter. Team agreed to adopt new testing framework.',
        summary: 'Q2 roadmap finalized with three major features planned and additional contractor budget approved to meet delivery targets.',
        keyDecisions: ['Adopt new testing framework', 'Hire 2 contractors for Q2', 'Mobile app priority over dashboard'],
        actionItems: [
          { task: 'Create technical debt backlog', assignee: 'Dev1', deadline: 'Monday', completed: true },
          { task: 'Mobile app wireframes', assignee: 'Dev2', deadline: 'Next week', completed: false },
          { task: 'Contractor job posting', assignee: 'Monica', deadline: 'This week', completed: true }
        ],
        nextMeetingTopics: ['Contractor onboarding', 'Sprint 13 planning', 'Technical debt review']
      },
      {
        userId: monica._id,
        goal: 'Marketing campaign strategy for summer product launch',
        attendees: 'Monica, Priya, Sara, John',
        duration: 45,
        agenda: '1. Campaign Overview - 10 mins\n2. Channel Strategy - 20 mins\n3. Budget Allocation - 15 mins',
        notes: 'Summer launch planned for June 15th. Priya proposed multi-channel campaign across social media, email, and paid ads. Total budget approved is 50000 rupees. Sara will handle social media content calendar. John suggested influencer partnerships for wider reach. Email campaign to target existing customers first. Paid ads budget set at 20000 rupees.',
        summary: 'Summer product launch campaign strategy finalized with 50000 rupee budget across social media, email, and paid advertising channels.',
        keyDecisions: ['Launch date June 15th', 'Influencer partnership approved', 'Email first then paid ads'],
        actionItems: [
          { task: 'Social media content calendar', assignee: 'Sara', deadline: 'June 1st', completed: false },
          { task: 'Influencer outreach list', assignee: 'John', deadline: 'May 25th', completed: false },
          { task: 'Email campaign template', assignee: 'Priya', deadline: 'May 20th', completed: true }
        ],
        nextMeetingTopics: ['Influencer responses', 'Content review', 'Launch checklist']
      },
      {
        userId: monica._id,
        goal: 'Customer support process improvement and team restructuring',
        attendees: 'Monica, Ravi, Alex, Tom',
        duration: 30,
        agenda: '1. Current Issues - 10 mins\n2. Process Changes - 15 mins\n3. Next Steps - 5 mins',
        notes: 'Customer satisfaction score dropped to 72 percent last month. Average response time is 8 hours which is too slow. Alex suggested implementing chatbot for first level support. Tom proposed shift restructuring for 24 hour coverage. Ravi will research chatbot solutions this week. Target is to bring satisfaction score above 85 percent by end of quarter.',
        summary: 'Support process overhaul planned with chatbot implementation and shift restructuring to improve satisfaction scores from 72% to 85%.',
        keyDecisions: ['Implement chatbot for L1 support', 'Restructure shifts for 24hr coverage', 'Weekly satisfaction score review'],
        actionItems: [
          { task: 'Research chatbot solutions', assignee: 'Ravi', deadline: 'This week', completed: true },
          { task: 'Shift restructure proposal', assignee: 'Tom', deadline: 'Monday', completed: false },
          { task: 'Satisfaction score dashboard', assignee: 'Alex', deadline: 'Next week', completed: false }
        ],
        nextMeetingTopics: ['Chatbot vendor selection', 'Shift schedule review', 'Q3 support targets']
      },
      {
        userId: monica._id,
        goal: 'Annual budget review and resource planning for next fiscal year',
        attendees: 'Monica, Ravi, Priya, John, Sara, Alex',
        duration: 120,
        agenda: '1. FY Review - 30 mins\n2. Department Budgets - 45 mins\n3. Hiring Plan - 30 mins\n4. Approval - 15 mins',
        notes: 'Annual revenue target achieved at 98 percent. Marketing underspent by 15 percent while development overspent by 8 percent. Hiring plan includes 5 new engineers and 2 sales executives. Priya requested 30 percent marketing budget increase for next year. Ravi confirmed sales team needs 2 more executives to hit next year targets. Total budget for next year approved at 2 crore rupees.',
        summary: 'FY budget review completed with 98% target achievement. Next year budget of 2 crore approved with 7 new hires planned across engineering and sales.',
        keyDecisions: ['Approve 2 crore budget for next FY', 'Hire 5 engineers and 2 sales executives', 'Increase marketing budget by 30%'],
        actionItems: [
          { task: 'Prepare hiring job descriptions', assignee: 'Monica', deadline: 'Next week', completed: false },
          { task: 'Marketing budget breakdown', assignee: 'Priya', deadline: 'This week', completed: false },
          { task: 'Sales territory planning', assignee: 'Ravi', deadline: 'End of month', completed: false }
        ],
        nextMeetingTopics: ['Hiring progress', 'Q1 targets', 'Budget allocation by department']
      }
    ]);
    console.log('Created 5 meetings for Monica.');

    // ── Schedules ────────────────────────────────────────────────────────────
    console.log('\nCreating schedules...');

    const now = new Date();

    function daysFromNow(days, hours, minutes) {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      d.setHours(hours, minutes, 0, 0);
      return d;
    }

    await Schedule.insertMany([
      {
        userId: monica._id,
        title: 'Weekly Marketing Sync',
        meetingGoal: 'Review weekly marketing metrics and campaign progress',
        teamId: marketingTeam._id,
        attendees: [
          { name: 'Monica Raja', email: 'monica@meetai.com' },
          { name: 'Ravi Kumar',  email: 'ravi@meetai.com'  },
          { name: 'Priya Singh', email: 'priya@meetai.com' },
          { name: 'John Mathew', email: 'john@meetai.com'  },
          { name: 'Sara Thomas', email: 'sara@meetai.com'  }
        ],
        date: daysFromNow(7, 10, 0),
        duration: 30,
        meetingType: 'online',
        platform: 'google-meet',
        meetingLink: 'https://meet.jit.si/AIMeetingAssistant-MKT001',
        status: 'scheduled'
      },
      {
        userId: monica._id,
        title: 'Q2 Planning Session',
        meetingGoal: 'Plan quarterly objectives and key results for all departments',
        teamId: devTeam._id,
        attendees: [
          { name: 'Monica Raja',    email: 'monica@meetai.com' },
          { name: 'Ravi Kumar',     email: 'ravi@meetai.com'   },
          { name: 'Priya Singh',    email: 'priya@meetai.com'  },
          { name: 'Dev One',        email: 'dev1@meetai.com'   },
          { name: 'Dev Two',        email: 'dev2@meetai.com'   },
          { name: 'Dev Three',      email: 'dev3@meetai.com'   }
        ],
        date: daysFromNow(3, 14, 0),
        duration: 120,
        meetingType: 'online',
        platform: 'teams',
        meetingLink: 'https://meet.jit.si/AIMeetingAssistant-Q2PLAN',
        status: 'scheduled'
      },
      {
        userId: monica._id,
        title: 'Client Presentation Rehearsal',
        meetingGoal: 'Rehearse and refine the enterprise client pitch presentation',
        teamId: salesTeam._id,
        attendees: [
          { name: 'Monica Raja',    email: 'monica@meetai.com' },
          { name: 'Ravi Kumar',     email: 'ravi@meetai.com'   },
          { name: 'Alex Fernandez', email: 'alex@meetai.com'   },
          { name: 'Tom Wilson',     email: 'tom@meetai.com'    }
        ],
        date: daysFromNow(-1, 11, 0),
        duration: 60,
        meetingType: 'offline',
        venue: 'Conference Room A, 2nd Floor',
        status: 'completed',
        attendanceFinalized: true,
        attendance: [
          { attendeeId: 'a1', name: 'Monica Raja',    email: 'monica@meetai.com', status: 'joined' },
          { attendeeId: 'a2', name: 'Ravi Kumar',     email: 'ravi@meetai.com',   status: 'joined' },
          { attendeeId: 'a3', name: 'Alex Fernandez', email: 'alex@meetai.com',   status: 'joined' },
          { attendeeId: 'a4', name: 'Tom Wilson',     email: 'tom@meetai.com',    status: 'absent' }
        ]
      },
      {
        userId: monica._id,
        title: 'Developer Standup',
        meetingGoal: 'Daily standup to discuss blockers and progress',
        teamId: devTeam._id,
        attendees: [
          { name: 'Monica Raja', email: 'monica@meetai.com' },
          { name: 'Priya Singh', email: 'priya@meetai.com'  },
          { name: 'Dev One',     email: 'dev1@meetai.com'   },
          { name: 'Dev Two',     email: 'dev2@meetai.com'   },
          { name: 'Dev Three',   email: 'dev3@meetai.com'   }
        ],
        date: daysFromNow(2, 9, 30),
        duration: 15,
        meetingType: 'online',
        platform: 'zoom',
        meetingLink: 'https://meet.jit.si/AIMeetingAssistant-STANDUP',
        status: 'scheduled'
      }
    ]);
    console.log('Created 4 schedules for Monica.');

    // ── Done ─────────────────────────────────────────────────────────────────
    console.log('\nSeed completed successfully!');
    console.log('Summary:');
    console.log('  Users    :', await User.countDocuments());
    console.log('  Teams    :', await Team.countDocuments());
    console.log('  Meetings :', await Meeting.countDocuments());
    console.log('  Schedules:', await Schedule.countDocuments());

  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

seed();
