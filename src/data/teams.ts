import { LeagueTeam, TeamUniforms } from '../types/career';

function makeUniforms(
  primary: string,
  secondary: string,
  helmet: string,
  pants: string,
  endzone?: string,
  awayPants?: string
): TeamUniforms {
  return {
    home: {
      helmet,
      logo: secondary,
      shirt: primary,
      sleeve: secondary,
      pants,
      stripe: secondary,
      socks1: primary,
      socks2: secondary,
    },
    away: {
      helmet,
      logo: primary,
      shirt: '#f8fafc',
      sleeve: primary,
      pants: awayPants ?? primary,
      stripe: primary,
      socks1: '#f8fafc',
      socks2: primary,
    },
    alt: {
      helmet: primary,
      logo: secondary,
      shirt: secondary === '#ffffff' ? '#0f172a' : secondary,
      sleeve: primary,
      pants: primary,
      stripe: '#ffffff',
      socks1: primary,
      socks2: '#ffffff',
    },
    endzone: endzone ?? primary,
  };
}

import { HIGH_SCHOOL_TEAMS, US_STATES } from './highSchools';
export { HIGH_SCHOOL_TEAMS, US_STATES };

type CollegeSpec = [string, string, string, string, string, string, string, string, number, number, string];
// [id, school, mascot, tla, conf, city, primary, secondary, off, def, stadium]
const COLLEGE_SPECS: CollegeSpec[] = [
  // SEC (12)
  ['col_uga', 'Georgia', 'Bulldogs', 'UGA', 'SEC', 'Athens, GA', '#ba0c2f', '#000000', 10, 10, 'Sanford Stadium'],
  ['col_bama', 'Alabama', 'Crimson Tide', 'ALA', 'SEC', 'Tuscaloosa, AL', '#9e1b32', '#ffffff', 9, 9, 'Bryant-Denny Stadium'],
  ['col_tex', 'Texas', 'Longhorns', 'TEX', 'SEC', 'Austin, TX', '#bf5700', '#ffffff', 9, 9, 'DKR Memorial Stadium'],
  ['col_lsu', 'LSU', 'Tigers', 'LSU', 'SEC', 'Baton Rouge, LA', '#461d7c', '#fdd023', 9, 8, 'Tiger Stadium'],
  ['col_tenn', 'Tennessee', 'Volunteers', 'TEN', 'SEC', 'Knoxville, TN', '#ff8200', '#ffffff', 9, 8, 'Neyland Stadium'],
  ['col_miss', 'Ole Miss', 'Rebels', 'MISS', 'SEC', 'Oxford, MS', '#ce1126', '#14213d', 9, 7, 'Vaught-Hemingway'],
  ['col_tamu', 'Texas A&M', 'Aggies', 'TAMU', 'SEC', 'College Station, TX', '#500000', '#ffffff', 8, 8, 'Kyle Field'],
  ['col_ou', 'Oklahoma', 'Sooners', 'OU', 'SEC', 'Norman, OK', '#841617', '#fdf9d8', 8, 8, 'Memorial Stadium'],
  ['col_uf', 'Florida', 'Gators', 'UF', 'SEC', 'Gainesville, FL', '#0021a5', '#fa4616', 7, 7, 'The Swamp'],
  ['col_aub', 'Auburn', 'Tigers', 'AUB', 'SEC', 'Auburn, AL', '#0c2340', '#e87722', 7, 8, 'Jordan-Hare Stadium'],
  ['col_sc', 'South Carolina', 'Gamecocks', 'SC', 'SEC', 'Columbia, SC', '#73000a', '#000000', 7, 8, 'Williams-Brice'],
  ['col_mizz', 'Missouri', 'Tigers', 'MIZ', 'SEC', 'Columbia, MO', '#f1b82d', '#000000', 8, 7, 'Faurot Field'],

  // Big Ten (12)
  ['col_osu', 'Ohio State', 'Buckeyes', 'OSU', 'Big Ten', 'Columbus, OH', '#bb0000', '#666666', 10, 9, 'Ohio Stadium'],
  ['col_ore', 'Oregon', 'Ducks', 'ORE', 'Big Ten', 'Eugene, OR', '#154733', '#fee123', 10, 8, 'Autzen Stadium'],
  ['col_mich', 'Michigan', 'Wolverines', 'MICH', 'Big Ten', 'Ann Arbor, MI', '#00274c', '#ffcb05', 8, 10, 'Michigan Stadium'],
  ['col_psu', 'Penn State', 'Nittany Lions', 'PSU', 'Big Ten', 'State College, PA', '#041e42', '#ffffff', 8, 9, 'Beaver Stadium'],
  ['col_usc', 'USC', 'Trojans', 'USC', 'Big Ten', 'Los Angeles, CA', '#990000', '#ffc72c', 9, 7, 'LA Memorial Coliseum'],
  ['col_wash', 'Washington', 'Huskies', 'WASH', 'Big Ten', 'Seattle, WA', '#4b2e83', '#b7a57a', 8, 7, 'Husky Stadium'],
  ['col_iowa', 'Iowa', 'Hawkeyes', 'IOWA', 'Big Ten', 'Iowa City, IA', '#000000', '#ffcd00', 6, 9, 'Kinnick Stadium'],
  ['col_wisc', 'Wisconsin', 'Badgers', 'WIS', 'Big Ten', 'Madison, WI', '#c5050c', '#ffffff', 7, 8, 'Camp Randall'],
  ['col_neb', 'Nebraska', 'Cornhuskers', 'NEB', 'Big Ten', 'Lincoln, NE', '#e41c38', '#ffffff', 7, 7, 'Memorial Stadium'],
  ['col_ind', 'Indiana', 'Hoosiers', 'IND', 'Big Ten', 'Bloomington, IN', '#990000', '#eeedeb', 8, 8, 'Memorial Stadium'],
  ['col_msu', 'Michigan State', 'Spartans', 'MSU', 'Big Ten', 'East Lansing, MI', '#18453b', '#ffffff', 7, 7, 'Spartan Stadium'],
  ['col_ucla', 'UCLA', 'Bruins', 'UCLA', 'Big Ten', 'Los Angeles, CA', '#2774ae', '#ffd100', 7, 7, 'Rose Bowl'],

  // ACC (10)
  ['col_clem', 'Clemson', 'Tigers', 'CLEM', 'ACC', 'Clemson, SC', '#f56600', '#522d80', 9, 9, 'Memorial Stadium'],
  ['col_mia', 'Miami', 'Hurricanes', 'MIA', 'ACC', 'Coral Gables, FL', '#f47321', '#005030', 9, 7, 'Hard Rock Stadium'],
  ['col_fsu', 'Florida State', 'Seminoles', 'FSU', 'ACC', 'Tallahassee, FL', '#782f40', '#ceb888', 8, 8, 'Doak Campbell'],
  ['col_smu', 'SMU', 'Mustangs', 'SMU', 'ACC', 'Dallas, TX', '#cc0035', '#0033a0', 9, 7, 'Ford Stadium'],
  ['col_lou', 'Louisville', 'Cardinals', 'LOU', 'ACC', 'Louisville, KY', '#ad0000', '#000000', 8, 7, 'L&N Stadium'],
  ['col_vt', 'Virginia Tech', 'Hokies', 'VT', 'ACC', 'Blacksburg, VA', '#630031', '#cf4420', 7, 8, 'Lane Stadium'],
  ['col_unc', 'North Carolina', 'Tar Heels', 'UNC', 'ACC', 'Chapel Hill, NC', '#7bafd4', '#ffffff', 8, 6, 'Kenan Stadium'],
  ['col_ncst', 'NC State', 'Wolfpack', 'NCST', 'ACC', 'Raleigh, NC', '#cc0000', '#000000', 7, 7, 'Carter-Finley'],
  ['col_gt', 'Georgia Tech', 'Yellow Jackets', 'GT', 'ACC', 'Atlanta, GA', '#b3a369', '#003057', 7, 7, 'Bobby Dodd'],
  ['col_stan', 'Stanford', 'Cardinal', 'STAN', 'ACC', 'Stanford, CA', '#8c1515', '#ffffff', 6, 7, 'Stanford Stadium'],

  // Big 12 (10)
  ['col_byu', 'BYU', 'Cougars', 'BYU', 'Big 12', 'Provo, UT', '#002e5d', '#ffffff', 8, 8, 'LaVell Edwards'],
  ['col_asu', 'Arizona State', 'Sun Devils', 'ASU', 'Big 12', 'Tempe, AZ', '#8c1d40', '#ffc627', 8, 8, 'Mountain America'],
  ['col_isu', 'Iowa State', 'Cyclones', 'ISU', 'Big 12', 'Ames, IA', '#c8102e', '#f1be48', 8, 8, 'Jack Trice Stadium'],
  ['col_colo', 'Colorado', 'Buffaloes', 'COLO', 'Big 12', 'Boulder, CO', '#cfb87c', '#000000', 8, 7, 'Folsom Field'],
  ['col_ksu', 'Kansas State', 'Wildcats', 'KSU', 'Big 12', 'Manhattan, KS', '#512888', '#d1d1d1', 8, 8, 'Bill Snyder Family'],
  ['col_utah', 'Utah', 'Utes', 'UTAH', 'Big 12', 'Salt Lake City, UT', '#cc0000', '#ffffff', 7, 9, 'Rice-Eccles'],
  ['col_tcu', 'TCU', 'Horned Frogs', 'TCU', 'Big 12', 'Fort Worth, TX', '#4d1979', '#a3a9ac', 8, 7, 'Amon G. Carter'],
  ['col_ttu', 'Texas Tech', 'Red Raiders', 'TTU', 'Big 12', 'Lubbock, TX', '#cc0000', '#000000', 8, 6, 'Jones AT&T'],
  ['col_okst', 'Oklahoma State', 'Cowboys', 'OKST', 'Big 12', 'Stillwater, OK', '#fe5c00', '#000000', 8, 7, 'Boone Pickens'],
  ['col_bay', 'Baylor', 'Bears', 'BAY', 'Big 12', 'Waco, TX', '#154734', '#ffb81c', 7, 7, 'McLane Stadium'],

  // Independents / Mountain West / G5 Standouts (4)
  ['col_nd', 'Notre Dame', 'Fighting Irish', 'ND', 'Indep.', 'South Bend, IN', '#0c2340', '#c99700', 9, 9, 'Notre Dame Stadium'],
  ['col_bsu', 'Boise State', 'Broncos', 'BSU', 'MW', 'Boise, ID', '#0033a0', '#d64309', 9, 7, 'Albertsons Stadium'],
  ['col_tul', 'Tulane', 'Green Wave', 'TUL', 'AAC', 'New Orleans, LA', '#006747', '#418fde', 8, 7, 'Yulman Stadium'],
  ['col_mem', 'Memphis', 'Tigers', 'MEM', 'AAC', 'Memphis, TN', '#003087', '#898d8d', 8, 7, 'Simmons Bank Liberty'],
];

export const COLLEGE_TEAMS: LeagueTeam[] = COLLEGE_SPECS.map((spec, idx) => {
  const [id, name, mascot, shortName, conference, city, primary, secondary, offense, defense, stadium] = spec;
  const helmet = id === 'col_nd' ? '#c99700' : id === 'col_uga' || id === 'col_osu' || id === 'col_bama' ? primary : '#ffffff';
  return {
    id,
    name: `${name} ${mascot}`,
    shortName,
    mascot,
    city,
    conference,
    division: conference,
    era: 'COLLEGE',
    offense,
    defense,
    prestige: Math.min(5, Math.max(3, Math.round((offense + defense) / 3.8))),
    roof: 0,
    rainfall: 32,
    snowfall: ['Big Ten', 'Indep.', 'MW'].includes(conference) ? 30 : 5,
    uniforms: makeUniforms(primary, secondary, helmet, '#ffffff', id === 'col_bsu' ? '#0033a0' : primary),
    rivalId: COLLEGE_SPECS[(idx + 1) % COLLEGE_SPECS.length][0],
    stadium,
  };
});

// All 32 real NFL franchises mapped directly to the exact Teams.txt / uniforms_default.txt colors
type NflSpec = [
  string, string, string, string, string, string, string,
  string, string, string, string, string, string, string, string,
  number, number, number, number, number
];
// [id, fullName, shortName, mascot, city, conf, div, helmet, shirt, sleeve, pants, stripe, altShirt, altPants, endzone, off, def, roof, rain, snow]
const NFL_SPECS: NflSpec[] = [
  ['nfl_buf', 'Buffalo Bills', 'BUF', 'Bills', 'Buffalo, NY', 'AFC', 'AFC East', '#ffffff', '#003087', '#c8102e', '#ffffff', '#c8102e', '#c8102e', '#c8102e', '#0202d9', 10, 7, 0, 40, 89],
  ['nfl_mia', 'Miami Dolphins', 'MIA', 'Dolphins', 'Miami, FL', 'AFC', 'AFC East', '#ffffff', '#008c95', '#ff6720', '#ffffff', '#008c95', '#007377', '#ffffff', '#00b4a4', 10, 5, 0, 59, 0],
  ['nfl_ne', 'New England Patriots', 'N.E', 'Patriots', 'Foxborough, MA', 'AFC', 'AFC East', '#a2aaad', '#0c2340', '#c8102e', '#a2aaad', '#c8102e', '#c8102e', '#ffffff', '#1d2253', 4, 6, 0, 49, 52],
  ['nfl_nyj', 'New York Jets', 'NYJ', 'Jets', 'East Rutherford, NJ', 'AFC', 'AFC East', '#115740', '#115740', '#ffffff', '#ffffff', '#115740', '#010101', '#010101', '#035826', 4, 8, 0, 47, 25],

  ['nfl_den', 'Denver Broncos', 'DEN', 'Broncos', 'Denver, CO', 'AFC', 'AFC West', '#0c2340', '#fc4c02', '#0c2340', '#ffffff', '#0c2340', '#001489', '#ffffff', '#e66e00', 6, 6, 0, 17, 62],
  ['nfl_kc', 'Kansas City Chiefs', 'K.C', 'Chiefs', 'Kansas City, MO', 'AFC', 'AFC West', '#c8102e', '#c8102e', '#ffb81c', '#ffffff', '#c8102e', '#c8102e', '#c8102e', '#dc0015', 9, 8, 0, 40, 15],
  ['nfl_lac', 'Los Angeles Chargers', 'LAC', 'Chargers', 'Inglewood, CA', 'AFC', 'AFC West', '#ffffff', '#0072ce', '#ffb81c', '#ffffff', '#ffb81c', '#003087', '#003087', '#3289f7', 8, 6, 2, 17, 0],
  ['nfl_lv', 'Las Vegas Raiders', 'L.V', 'Raiders', 'Las Vegas, NV', 'AFC', 'AFC West', '#87909a', '#010101', '#a2aaad', '#a2aaad', '#010101', '#010101', '#ffffff', '#000000', 4, 5, 1, 5, 0],

  ['nfl_bal', 'Baltimore Ravens', 'BAL', 'Ravens', 'Baltimore, MD', 'AFC', 'AFC North', '#1d252d', '#24125f', '#010101', '#ffffff', '#24125f', '#211747', '#211747', '#361d7d', 9, 9, 0, 45, 19],
  ['nfl_cin', 'Cincinnati Bengals', 'CIN', 'Bengals', 'Cincinnati, OH', 'AFC', 'AFC North', '#e44c0d', '#010101', '#dc4405', '#ffffff', '#dc4405', '#dc4405', '#010101', '#e0571e', 8, 5, 0, 42, 14],
  ['nfl_cle', 'Cleveland Browns', 'CLE', 'Browns', 'Cleveland, OH', 'AFC', 'AFC North', '#eb3300', '#321c00', '#ffffff', '#eb3300', '#ffffff', '#321c00', '#ffffff', '#4f3531', 4, 8, 0, 40, 61],
  ['nfl_pit', 'Pittsburgh Steelers', 'PIT', 'Steelers', 'Pittsburgh, PA', 'AFC', 'AFC North', '#1d252d', '#010101', '#ffb81c', '#ffb81c', '#010101', '#010101', '#010101', '#222121', 6, 8, 0, 38, 27],

  ['nfl_hou', 'Houston Texans', 'HOU', 'Texans', 'Houston, TX', 'AFC', 'AFC South', '#112734', '#091f2c', '#a6192e', '#ffffff', '#091f2c', '#a6192e', '#ffffff', '#17205b', 8, 7, 2, 51, 0],
  ['nfl_ind', 'Indianapolis Colts', 'IND', 'Colts', 'Indianapolis, IN', 'AFC', 'AFC South', '#ffffff', '#003a70', '#ffffff', '#ffffff', '#003a70', '#236192', '#236192', '#202e82', 6, 5, 1, 42, 21],
  ['nfl_jax', 'Jacksonville Jaguars', 'JAX', 'Jaguars', 'Jacksonville, FL', 'AFC', 'AFC South', '#1d252d', '#006271', '#010101', '#010101', '#010101', '#010101', '#010101', '#292929', 6, 6, 0, 50, 0],
  ['nfl_ten', 'Tennessee Titans', 'TEN', 'Titans', 'Nashville, TN', 'AFC', 'AFC South', '#142b48', '#0c2340', '#418fde', '#0c2340', '#418fde', '#418fde', '#ffffff', '#181a40', 5, 5, 0, 45, 2],

  ['nfl_dal', 'Dallas Cowboys', 'DAL', 'Cowboys', 'Arlington, TX', 'NFC', 'NFC East', '#87909a', '#ffffff', '#003087', '#aecbd1', '#003087', '#0c2340', '#ffffff', '#0c2340', 8, 7, 1, 39, 1],
  ['nfl_nyg', 'New York Giants', 'NYG', 'Giants', 'East Rutherford, NJ', 'NFC', 'NFC East', '#132e85', '#001e62', '#a6192e', '#ffffff', '#a6192e', '#003087', '#ffffff', '#001cc8', 4, 5, 0, 47, 25],
  ['nfl_phi', 'Philadelphia Eagles', 'PHI', 'Eagles', 'Philadelphia, PA', 'NFC', 'NFC East', '#013d41', '#004851', '#010101', '#ffffff', '#004851', '#046a38', '#8d9093', '#264933', 9, 8, 0, 47, 15],
  ['nfl_was', 'Washington Commanders', 'WAS', 'Commanders', 'Landover, MD', 'NFC', 'NFC East', '#651c32', '#651c32', '#ffb81c', '#ffffff', '#ffb81c', '#010101', '#010101', '#641313', 7, 5, 0, 43, 13],

  ['nfl_ari', 'Arizona Cardinals', 'ARI', 'Cardinals', 'Glendale, AZ', 'NFC', 'NFC West', '#ffffff', '#9b2743', '#ffffff', '#9b2743', '#ffffff', '#010101', '#010101', '#a20000', 6, 4, 1, 9, 0],
  ['nfl_lar', 'Los Angeles Rams', 'LAR', 'Rams', 'Inglewood, CA', 'NFC', 'NFC West', '#001ebb', '#1e22aa', '#ffd100', '#ffd100', '#1e22aa', '#d7d2cb', '#d7d2cb', '#0042B9', 8, 6, 2, 17, 0],
  ['nfl_sf', 'San Francisco 49ers', 'S.F', '49ers', 'Santa Clara, CA', 'NFC', 'NFC West', '#89734c', '#a6192e', '#ffffff', '#c6aa76', '#a6192e', '#a6192e', '#ffffff', '#a60303', 9, 8, 0, 24, 0],
  ['nfl_sea', 'Seattle Seahawks', 'SEA', 'Seahawks', 'Seattle, WA', 'NFC', 'NFC West', '#122340', '#0c2340', '#78be21', '#0c2340', '#78be21', '#78be21', '#78be21', '#283166', 7, 6, 0, 37, 5],

  ['nfl_chi', 'Chicago Bears', 'CHI', 'Bears', 'Chicago, IL', 'NFC', 'NFC North', '#16141f', '#091f2c', '#dc4405', '#ffffff', '#091f2c', '#fb4900', '#ffffff', '#283166', 6, 6, 0, 38, 35],
  ['nfl_det', 'Detroit Lions', 'DET', 'Lions', 'Detroit, MI', 'NFC', 'NFC North', '#87909a', '#0069b1', '#a2aaad', '#a2aaad', '#0069b1', '#545859', '#545859', '#0093E4', 10, 8, 2, 39, 32],
  ['nfl_gb', 'Green Bay Packers', 'G.B', 'Packers', 'Green Bay, WI', 'NFC', 'NFC North', '#ffb81c', '#183029', '#ffb81c', '#ffb81c', '#183029', '#f2a900', '#046a38', '#385022', 8, 7, 0, 30, 48],
  ['nfl_min', 'Minnesota Vikings', 'MIN', 'Vikings', 'Minneapolis, MN', 'NFC', 'NFC North', '#553481', '#582c83', '#ffc72c', '#ffffff', '#582c83', '#221551', '#ffffff', '#731995', 8, 8, 2, 32, 53],

  ['nfl_atl', 'Atlanta Falcons', 'ATL', 'Falcons', 'Atlanta, GA', 'NFC', 'NFC South', '#1d252d', '#010101', '#a6192e', '#ffffff', '#a6192e', '#a6192e', '#ffffff', '#c80000', 7, 6, 1, 51, 1],
  ['nfl_car', 'Carolina Panthers', 'CAR', 'Panthers', 'Charlotte, NC', 'NFC', 'NFC South', '#8d9093', '#101820', '#0085ca', '#b2b4b2', '#0085ca', '#0085ca', '#ffffff', '#191919', 4, 4, 0, 44, 2],
  ['nfl_no', 'New Orleans Saints', 'N.O', 'Saints', 'New Orleans, LA', 'NFC', 'NFC South', '#a28d5b', '#010101', '#d3bc8d', '#010101', '#010101', '#ffffff', '#ffffff', '#000000', 6, 6, 2, 63, 0],
  ['nfl_tb', 'Tampa Bay Buccaneers', 'T.B', 'Buccaneers', 'Tampa, FL', 'NFC', 'NFC South', '#433d37', '#a6192e', '#3d3935', '#ffffff', '#a6192e', '#ff8200', '#ffffff', '#B80722', 7, 6, 0, 50, 0],
];

export const NFL_TEAMS: LeagueTeam[] = NFL_SPECS.map((s) => {
  const [
    id, name, shortName, mascot, city, conference, division,
    helmet, shirt, sleeve, pants, stripe, altShirt, altPants, endzone,
    offense, defense, roof, rainfall, snowfall,
  ] = s;
  return {
    id,
    name,
    shortName,
    mascot,
    city,
    conference,
    division,
    era: 'NFL',
    offense,
    defense,
    prestige: Math.min(5, Math.max(2, Math.round((offense + defense) / 3.8))),
    roof,
    rainfall,
    snowfall,
    uniforms: {
      home: {
        helmet,
        logo: sleeve,
        shirt,
        sleeve,
        pants,
        stripe,
        socks1: shirt,
        socks2: sleeve,
      },
      away: {
        helmet,
        logo: shirt === '#ffffff' ? sleeve : shirt,
        shirt: '#ffffff',
        sleeve: shirt === '#ffffff' ? sleeve : shirt,
        pants,
        stripe,
        socks1: '#ffffff',
        socks2: shirt === '#ffffff' ? sleeve : shirt,
      },
      alt: {
        helmet,
        logo: stripe,
        shirt: altShirt,
        sleeve,
        pants: altPants,
        stripe,
        socks1: altShirt,
        socks2: sleeve,
      },
      endzone,
    },
  };
});

export const ALL_TEAMS: LeagueTeam[] = [...HIGH_SCHOOL_TEAMS, ...COLLEGE_TEAMS, ...NFL_TEAMS];

export function getTeamById(id: string): LeagueTeam {
  return ALL_TEAMS.find((t) => t.id === id) ?? NFL_TEAMS[0];
}

export function getTeamsForEra(era: 'HIGH_SCHOOL' | 'COLLEGE' | 'NFL', state?: string): LeagueTeam[] {
  if (era === 'HIGH_SCHOOL') {
    if (state) {
      return HIGH_SCHOOL_TEAMS.filter((t) => t.state === state);
    }
    return HIGH_SCHOOL_TEAMS;
  }
  if (era === 'COLLEGE') return COLLEGE_TEAMS;
  return NFL_TEAMS;
}
