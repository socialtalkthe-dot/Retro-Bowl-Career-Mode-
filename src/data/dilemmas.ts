import { CareerEra, DilemmaEvent, Position } from '../types/career';

const UNIFORM_VIOLATIONS = [
  'Towel',
  'Socks',
  'Cleats',
  'Head band',
  'Wrist band',
  'Gloves',
  'Visor',
];

export function generatePlayerDilemma(
  era: Exclude<CareerEra, 'RETIRED'>,
  position: Position,
  coachName: string,
  teammateName: string,
  teamName: string,
  rivalName: string
): DilemmaEvent {
  const violation = UNIFORM_VIOLATIONS[Math.floor(Math.random() * UNIFORM_VIOLATIONS.length)];

  const commonDilemmas: DilemmaEvent[] = [
    {
      id: `d_curfew_${Date.now()}`,
      title: 'Team Curfew Temptation',
      category: 'DISCIPLINE',
      prompt: `${teammateName} texts you late Friday night—half the starters are heading out past curfew before ${rivalName}. Are you coming?`,
      choices: [
        {
          id: 'stay_in',
          label: 'Stay in & Watch Film',
          summary: '+Coach Trust · +XP · -Teammate Buzz',
          effects: { coach: 6, teammates: -3, xp: 45, condition: 4 },
          outcomeText: `Coach ${coachName} noticed your extra film notes on Saturday morning. You feel sharp and rested.`,
        },
        {
          id: 'go_out',
          label: 'Roll with the Squad',
          summary: '+Teammates · +Morale · -Condition · Risk Coach',
          effects: { teammates: 8, coach: -7, morale: 6, condition: -8 },
          outcomeText: `You bonded with ${teammateName} and the locker room, though word got back to Coach ${coachName}.`,
        },
      ],
    },
    {
      id: `d_bustup_${Date.now()}`,
      title: 'Sideline Argument',
      category: 'LOCKER_ROOM',
      prompt: `During practice, ${teammateName} got into a heated shouting match with Coach ${coachName} over playcalling. Both look at you to back them up.`,
      choices: [
        {
          id: 'back_coach',
          label: 'Back Coach ' + coachName,
          summary: '+Coach Trust · -Teammate Chemistry',
          effects: { coach: 8, teammates: -6, morale: -2 },
          outcomeText: `Coach ${coachName} appreciated your discipline, but ${teammateName} gave you the cold shoulder in the locker room.`,
        },
        {
          id: 'back_player',
          label: 'Stand Up for ' + teammateName,
          summary: '+Teammate Chemistry · -Coach Trust',
          effects: { teammates: 9, coach: -7, morale: 4 },
          outcomeText: `The locker room respected that you had ${teammateName}'s back, even if Coach ${coachName} isn't thrilled.`,
        },
      ],
    },
    {
      id: `d_media_${Date.now()}`,
      title: 'Post-Practice Press Mic',
      category: 'MEDIA',
      prompt: `A local beat reporter catches you walking off the field: "Everyone thinks ${teamName}'s ${position} room is carrying the whole squad. Agree?"`,
      choices: [
        {
          id: 'humble',
          label: 'Credit the Whole Team',
          summary: '+Teammates · +Coach Trust · +Fans',
          effects: { teammates: 5, coach: 4, fans: 4 },
          outcomeText: `"It starts up front and with all 11 guys," you tell the cameras. Great team-first quote.`,
        },
        {
          id: 'swagger',
          label: '"Put the Ball in My Hands"',
          summary: '+Fans · +Morale · -Coach Trust',
          effects: { fans: 9, morale: 6, coach: -4, teammates: -2 },
          outcomeText: `Your confident soundbite went viral overnight. Fans love the swagger—Coach wants you to back it up.`,
        },
      ],
    },
    {
      id: `d_retrobowl_meeting_${Date.now()}`,
      title: 'Caught Gaming in Film',
      category: 'LOCKER_ROOM',
      prompt: `You caught ${teammateName} playing Retro Bowl on their phone in the back row during a defensive install meeting.`,
      choices: [
        {
          id: 'cover_him',
          label: 'Cover for Them',
          summary: '+Teammates · +Morale · -Coach if caught',
          effects: { teammates: 7, morale: 4, coach: -3 },
          outcomeText: `You nudged ${teammateName} before Coach turned around. Owed you a favor.`,
        },
        {
          id: 'lock_in',
          label: 'Tell Them to Lock In',
          summary: '+Coach Trust · +XP · -Teammates',
          effects: { coach: 5, xp: 35, teammates: -3 },
          outcomeText: `You kept the room focused on ${rivalName}'s tendencies.`,
        },
      ],
    },
  ];

  const hsDilemmas: DilemmaEvent[] = [
    {
      id: `d_hs_exam_${Date.now()}`,
      title: 'Midterm Study vs. Extra Reps',
      category: 'ACADEMICS',
      prompt: `Your AP History midterm is tomorrow morning, but the offensive coordinator is running an optional 7-on-7 session tonight.`,
      choices: [
        {
          id: 'study_midterm',
          label: 'Hit the Books Tonight',
          summary: '+0.25 GPA · +Family Trust · -Condition',
          effects: { gpa: 0.25, agent: 6, coach: -2, condition: 3 },
          outcomeText: `You aced the midterm and kept your NCAA clearinghouse GPA rock-solid.`,
        },
        {
          id: 'extra_reps',
          label: 'Grind 7-on-7 Reps',
          summary: '+65 XP · +Coach Trust · -0.15 GPA',
          effects: { xp: 65, coach: 6, gpa: -0.15, condition: -5 },
          outcomeText: `You dominated the 7-on-7 session, though you barely scraped a C on the exam.`,
        },
      ],
    },
    {
      id: `d_hs_camp_${Date.now()}`,
      title: 'Regional Recruiting Combine',
      category: 'CAREER',
      prompt: `Scouts invited you to a Sunday showcase camp two hours away, but your high school coach wants everyone in the weight room for recovery.`,
      choices: [
        {
          id: 'go_camp',
          label: 'Attend Scout Showcase',
          summary: '+Recruiting Buzz · +Fans · -Condition',
          effects: { fans: 8, agent: 6, starBoost: 0.15, condition: -7, coach: -4 },
          outcomeText: `College recruiters logged your verified 40-yard dash and praised your burst!`,
        },
        {
          id: 'stay_recovery',
          label: 'Stay with Varsity Squad',
          summary: '+Coach Trust · +Condition · +Teammates',
          effects: { coach: 7, condition: 8, teammates: 5 },
          outcomeText: `Coach ${coachName} told college recruiters you're the ultimate team leader.`,
        },
      ],
    },
  ];

  const collegeDilemmas: DilemmaEvent[] = [
    {
      id: `d_col_nil_${Date.now()}`,
      title: 'Local Dealership NIL Offer',
      category: 'NIL_FINANCE',
      prompt: `A local auto group offers $4,500 cash for a Thursday afternoon commercial shoot—which overlaps with your afternoon walkthrough.`,
      choices: [
        {
          id: 'take_nil',
          label: 'Film the NIL Commercial',
          summary: '+$4,500 Cash · +Fans · -Coach Trust',
          effects: { cash: 4500, fans: 6, coach: -6, xp: -10 },
          outcomeText: `The check cleared immediately and your billboard is up on the highway, though Coach docked your walkthrough grade.`,
        },
        {
          id: 'skip_nil',
          label: 'Decline & Attend Walkthrough',
          summary: '+Coach Trust · +XP · +Teammates',
          effects: { coach: 8, xp: 55, teammates: 4 },
          outcomeText: `Coach ${coachName} praised your commitment in front of the whole position room.`,
        },
      ],
    },
    {
      id: `d_col_uniform_${Date.now()}`,
      title: `Uniform Violation (${violation})`,
      category: 'DISCIPLINE',
      prompt: `Conference officials flagged your custom ${violation.toLowerCase()} from last Saturday's win. The athletic department wants a public apology.`,
      choices: [
        {
          id: 'apologize',
          label: 'Switch to Standard Gear',
          summary: '+Coach Trust · -Fans',
          effects: { coach: 5, fans: -3, morale: -2 },
          outcomeText: `Crisis averted—no suspension risk heading into next week.`,
        },
        {
          id: 'keep_drip',
          label: 'Keep the Signature Look',
          summary: '+Fans · +Morale · -$500 Fine',
          effects: { fans: 10, morale: 7, cash: -500, coach: -5 },
          outcomeText: `Students chanted your name on campus, even if the compliance office sent you a fine.`,
        },
      ],
    },
  ];

  const nflDilemmas: DilemmaEvent[] = [
    {
      id: `d_nfl_fine_${Date.now()}`,
      title: `League Fine: ${violation}`,
      category: 'DISCIPLINE',
      prompt: `The league office fined you $12,000 for a uniform violation (${violation}) during Sunday's broadcast. Your agent asks if you want to appeal or pay quietly.`,
      choices: [
        {
          id: 'pay_quiet',
          label: 'Pay Fine Quietly',
          summary: '-$12,000 Cash · +Coach Trust',
          effects: { cash: -12000, coach: 4, agent: 2 },
          outcomeText: `You paid the fine and kept the focus on Sunday's game plan.`,
        },
        {
          id: 'clown_league',
          label: 'Post the Letter on Socials',
          summary: '+Fans · +Morale · -$12,000 Cash · -Coach',
          effects: { cash: -12000, fans: 12, morale: 6, coach: -4 },
          outcomeText: `Your post got 400K likes and fans started wearing matching ${violation.toLowerCase()}s to the stadium.`,
        },
      ],
    },
    {
      id: `d_nfl_charity_${Date.now()}`,
      title: 'Community Youth Camp',
      category: 'MEDIA',
      prompt: `Your agent lined up a free local youth football clinic in ${teamName.split(' ')[0]} on your Tuesday off-day.`,
      choices: [
        {
          id: 'host_camp',
          label: 'Host the Youth Clinic',
          summary: '+Fans · +Agent · +Morale · -Condition',
          effects: { fans: 12, agent: 6, morale: 8, condition: -4, cash: -2500 },
          outcomeText: `Local news ran a glowing feature on your foundation's work with kids.`,
        },
        {
          id: 'rehab_day',
          label: 'Take Full Rehab Day',
          summary: '+12 Condition · +XP',
          effects: { condition: 12, xp: 30, fans: -2 },
          outcomeText: `Your legs feel 100% fresh heading into practice.`,
        },
      ],
    },
    {
      id: `d_nfl_sponsor_${Date.now()}`,
      title: 'National Energy Drink Spot',
      category: 'NIL_FINANCE',
      prompt: `An energy drink brand wants you as the face of their Sunday commercial—$45,000 endorsement, but it requires a red-eye flight on your off day.`,
      choices: [
        {
          id: 'shoot_ad',
          label: 'Fly Out & Shoot Spot',
          summary: '+$45,000 Cash · +Fans · -Condition',
          effects: { cash: 45000, fans: 8, condition: -9, agent: 5 },
          outcomeText: `Massive payday and national TV exposure—just grab some extra ice baths.`,
        },
        {
          id: 'focus_playbook',
          label: 'Stay in Town & Prep',
          summary: '+Coach Trust · +XP · +Condition',
          effects: { coach: 7, xp: 75, condition: 4 },
          outcomeText: `You stayed at the facility breaking down coverage shells with the coordinators.`,
        },
      ],
    },
  ];

  const pool = [
    ...commonDilemmas,
    ...(era === 'HIGH_SCHOOL' ? hsDilemmas : era === 'COLLEGE' ? collegeDilemmas : nflDilemmas),
  ];

  return pool[Math.floor(Math.random() * pool.length)];
}
