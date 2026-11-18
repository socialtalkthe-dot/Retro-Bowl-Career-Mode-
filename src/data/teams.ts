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

type CollegeSpec = [
  string,
  string,
  string,
  string,
  string,
  'FBS' | 'FCS',
  string,
  string,
  string,
  number,
  number,
  string
];
// [id, school, mascot, tla, conf, subdivision, city, primary, secondary, off, def, stadium]
const COLLEGE_SPECS: CollegeSpec[] = [
  // SEC (FBS)
  ['col_uga', 'Georgia', 'Bulldogs', 'UGA', 'SEC', 'FBS', 'Athens, GA', '#ba0c2f', '#000000', 10, 10, 'Sanford Stadium'],
  ['col_bama', 'Alabama', 'Crimson Tide', 'ALA', 'SEC', 'FBS', 'Tuscaloosa, AL', '#9e1b32', '#ffffff', 9, 9, 'Bryant-Denny Stadium'],
  ['col_tex', 'Texas', 'Longhorns', 'TEX', 'SEC', 'FBS', 'Austin, TX', '#bf5700', '#ffffff', 9, 9, 'DKR Memorial Stadium'],
  ['col_lsu', 'LSU', 'Tigers', 'LSU', 'SEC', 'FBS', 'Baton Rouge, LA', '#461d7c', '#fdd023', 9, 8, 'Tiger Stadium'],
  ['col_tenn', 'Tennessee', 'Volunteers', 'TEN', 'SEC', 'FBS', 'Knoxville, TN', '#ff8200', '#ffffff', 9, 8, 'Neyland Stadium'],
  ['col_miss', 'Ole Miss', 'Rebels', 'MISS', 'SEC', 'FBS', 'Oxford, MS', '#ce1126', '#14213d', 9, 7, 'Vaught-Hemingway'],
  ['col_tamu', 'Texas A&M', 'Aggies', 'TAMU', 'SEC', 'FBS', 'College Station, TX', '#500000', '#ffffff', 8, 8, 'Kyle Field'],
  ['col_ou', 'Oklahoma', 'Sooners', 'OU', 'SEC', 'FBS', 'Norman, OK', '#841617', '#fdf9d8', 8, 8, 'Memorial Stadium'],
  ['col_uf', 'Florida', 'Gators', 'UF', 'SEC', 'FBS', 'Gainesville, FL', '#0021a5', '#fa4616', 7, 7, 'The Swamp'],
  ['col_aub', 'Auburn', 'Tigers', 'AUB', 'SEC', 'FBS', 'Auburn, AL', '#0c2340', '#e87722', 7, 8, 'Jordan-Hare Stadium'],
  ['col_sc', 'South Carolina', 'Gamecocks', 'SC', 'SEC', 'FBS', 'Columbia, SC', '#73000a', '#000000', 7, 8, 'Williams-Brice'],
  ['col_mizz', 'Missouri', 'Tigers', 'MIZ', 'SEC', 'FBS', 'Columbia, MO', '#f1b82d', '#000000', 8, 7, 'Faurot Field'],

  // Big Ten (FBS)
  ['col_osu', 'Ohio State', 'Buckeyes', 'OSU', 'Big Ten', 'FBS', 'Columbus, OH', '#bb0000', '#666666', 10, 9, 'Ohio Stadium'],
  ['col_ore', 'Oregon', 'Ducks', 'ORE', 'Big Ten', 'FBS', 'Eugene, OR', '#154733', '#fee123', 10, 8, 'Autzen Stadium'],
  ['col_mich', 'Michigan', 'Wolverines', 'MICH', 'Big Ten', 'FBS', 'Ann Arbor, MI', '#00274c', '#ffcb05', 8, 10, 'Michigan Stadium'],
  ['col_psu', 'Penn State', 'Nittany Lions', 'PSU', 'Big Ten', 'FBS', 'State College, PA', '#041e42', '#ffffff', 8, 9, 'Beaver Stadium'],
  ['col_usc', 'USC', 'Trojans', 'USC', 'Big Ten', 'FBS', 'Los Angeles, CA', '#990000', '#ffc72c', 9, 7, 'LA Memorial Coliseum'],
  ['col_wash', 'Washington', 'Huskies', 'WASH', 'Big Ten', 'FBS', 'Seattle, WA', '#4b2e83', '#b7a57a', 8, 7, 'Husky Stadium'],
  ['col_iowa', 'Iowa', 'Hawkeyes', 'IOWA', 'Big Ten', 'FBS', 'Iowa City, IA', '#000000', '#ffcd00', 6, 9, 'Kinnick Stadium'],
  ['col_wisc', 'Wisconsin', 'Badgers', 'WIS', 'Big Ten', 'FBS', 'Madison, WI', '#c5050c', '#ffffff', 7, 8, 'Camp Randall'],
  ['col_neb', 'Nebraska', 'Cornhuskers', 'NEB', 'Big Ten', 'FBS', 'Lincoln, NE', '#e41c38', '#ffffff', 7, 7, 'Memorial Stadium'],
  ['col_ind', 'Indiana', 'Hoosiers', 'IND', 'Big Ten', 'FBS', 'Bloomington, IN', '#990000', '#eeedeb', 8, 8, 'Memorial Stadium'],
  ['col_msu', 'Michigan State', 'Spartans', 'MSU', 'Big Ten', 'FBS', 'East Lansing, MI', '#18453b', '#ffffff', 7, 7, 'Spartan Stadium'],
  ['col_ucla', 'UCLA', 'Bruins', 'UCLA', 'Big Ten', 'FBS', 'Los Angeles, CA', '#2774ae', '#ffd100', 7, 7, 'Rose Bowl'],

  // ACC (FBS)
  ['col_clem', 'Clemson', 'Tigers', 'CLEM', 'ACC', 'FBS', 'Clemson, SC', '#f56600', '#522d80', 9, 9, 'Memorial Stadium'],
  ['col_mia', 'Miami', 'Hurricanes', 'MIA', 'ACC', 'FBS', 'Coral Gables, FL', '#f47321', '#005030', 9, 7, 'Hard Rock Stadium'],
  ['col_fsu', 'Florida State', 'Seminoles', 'FSU', 'ACC', 'FBS', 'Tallahassee, FL', '#782f40', '#ceb888', 8, 8, 'Doak Campbell'],
  ['col_smu', 'SMU', 'Mustangs', 'SMU', 'ACC', 'FBS', 'Dallas, TX', '#cc0035', '#0033a0', 9, 7, 'Ford Stadium'],
  ['col_lou', 'Louisville', 'Cardinals', 'LOU', 'ACC', 'FBS', 'Louisville, KY', '#ad0000', '#000000', 8, 7, 'L&N Stadium'],
  ['col_vt', 'Virginia Tech', 'Hokies', 'VT', 'ACC', 'FBS', 'Blacksburg, VA', '#630031', '#cf4420', 7, 8, 'Lane Stadium'],
  ['col_unc', 'North Carolina', 'Tar Heels', 'UNC', 'ACC', 'FBS', 'Chapel Hill, NC', '#7bafd4', '#ffffff', 8, 6, 'Kenan Stadium'],
  ['col_ncst', 'NC State', 'Wolfpack', 'NCST', 'ACC', 'FBS', 'Raleigh, NC', '#cc0000', '#000000', 7, 7, 'Carter-Finley'],
  ['col_gt', 'Georgia Tech', 'Yellow Jackets', 'GT', 'ACC', 'FBS', 'Atlanta, GA', '#b3a369', '#003057', 7, 7, 'Bobby Dodd'],
  ['col_stan', 'Stanford', 'Cardinal', 'STAN', 'ACC', 'FBS', 'Stanford, CA', '#8c1515', '#ffffff', 6, 7, 'Stanford Stadium'],

  // Big 12 (FBS)
  ['col_byu', 'BYU', 'Cougars', 'BYU', 'Big 12', 'FBS', 'Provo, UT', '#002e5d', '#ffffff', 8, 8, 'LaVell Edwards'],
  ['col_asu', 'Arizona State', 'Sun Devils', 'ASU', 'Big 12', 'FBS', 'Tempe, AZ', '#8c1d40', '#ffc627', 8, 8, 'Mountain America'],
  ['col_isu', 'Iowa State', 'Cyclones', 'ISU', 'Big 12', 'FBS', 'Ames, IA', '#c8102e', '#f1be48', 8, 8, 'Jack Trice Stadium'],
  ['col_colo', 'Colorado', 'Buffaloes', 'COLO', 'Big 12', 'FBS', 'Boulder, CO', '#cfb87c', '#000000', 8, 7, 'Folsom Field'],
  ['col_ksu', 'Kansas State', 'Wildcats', 'KSU', 'Big 12', 'FBS', 'Manhattan, KS', '#512888', '#d1d1d1', 8, 8, 'Bill Snyder Family'],
  ['col_utah', 'Utah', 'Utes', 'UTAH', 'Big 12', 'FBS', 'Salt Lake City, UT', '#cc0000', '#ffffff', 7, 9, 'Rice-Eccles'],
  ['col_tcu', 'TCU', 'Horned Frogs', 'TCU', 'Big 12', 'FBS', 'Fort Worth, TX', '#4d1979', '#a3a9ac', 8, 7, 'Amon G. Carter'],
  ['col_ttu', 'Texas Tech', 'Red Raiders', 'TTU', 'Big 12', 'FBS', 'Lubbock, TX', '#cc0000', '#000000', 8, 6, 'Jones AT&T'],
  ['col_okst', 'Oklahoma State', 'Cowboys', 'OKST', 'Big 12', 'FBS', 'Stillwater, OK', '#fe5c00', '#000000', 8, 7, 'Boone Pickens'],
  ['col_bay', 'Baylor', 'Bears', 'BAY', 'Big 12', 'FBS', 'Waco, TX', '#154734', '#ffb81c', 7, 7, 'McLane Stadium'],

  // Pac-12 & FBS Independents
  ['col_orst', 'Oregon State', 'Beavers', 'ORST', 'Pac-12', 'FBS', 'Corvallis, OR', '#dc4405', '#000000', 7, 7, 'Reser Stadium'],
  ['col_wsu', 'Washington State', 'Cougars', 'WSU', 'Pac-12', 'FBS', 'Pullman, WA', '#981e32', '#5e6a71', 8, 6, 'Martin Stadium'],
  ['col_nd', 'Notre Dame', 'Fighting Irish', 'ND', 'Indep.', 'FBS', 'South Bend, IN', '#0c2340', '#c99700', 9, 9, 'Notre Dame Stadium'],
  ['col_uconn', 'UConn', 'Huskies', 'CONN', 'Indep.', 'FBS', 'Storrs, CT', '#000e2f', '#ffffff', 6, 7, 'Rentschler Field'],
  ['col_umass', 'UMass', 'Minutemen', 'UMAS', 'Indep.', 'FBS', 'Amherst, MA', '#881c1c', '#ffffff', 5, 5, 'McGuirk Stadium'],

  // Mountain West (FBS)
  ['col_bsu', 'Boise State', 'Broncos', 'BSU', 'MW', 'FBS', 'Boise, ID', '#0033a0', '#d64309', 9, 7, 'Albertsons Stadium'],
  ['col_unlv', 'UNLV', 'Rebels', 'UNLV', 'MW', 'FBS', 'Las Vegas, NV', '#cf0a2c', '#666666', 8, 7, 'Allegiant Stadium'],
  ['col_fres', 'Fresno State', 'Bulldogs', 'FRES', 'MW', 'FBS', 'Fresno, CA', '#db0032', '#13284c', 7, 7, 'Valley Children Stadium'],
  ['col_csu', 'Colorado State', 'Rams', 'CSU', 'MW', 'FBS', 'Fort Collins, CO', '#1e4d2b', '#c8c372', 7, 6, 'Canvas Stadium'],
  ['col_sdsu', 'San Diego State', 'Aztecs', 'SDSU', 'MW', 'FBS', 'San Diego, CA', '#a6192e', '#000000', 6, 7, 'Snapdragon Stadium'],
  ['col_afa', 'Air Force', 'Falcons', 'AFA', 'MW', 'FBS', 'Colorado Springs, CO', '#003087', '#ffffff', 7, 7, 'Falcon Stadium'],
  ['col_sjsu', 'San Jose State', 'Spartans', 'SJSU', 'MW', 'FBS', 'San Jose, CA', '#0055a2', '#e5a823', 7, 6, 'CEFCU Stadium'],
  ['col_wyo', 'Wyoming', 'Cowboys', 'WYO', 'MW', 'FBS', 'Laramie, WY', '#492f24', '#ffc425', 6, 7, 'War Memorial Stadium'],

  // AAC (FBS)
  ['col_tul', 'Tulane', 'Green Wave', 'TUL', 'AAC', 'FBS', 'New Orleans, LA', '#006747', '#418fde', 8, 7, 'Yulman Stadium'],
  ['col_mem', 'Memphis', 'Tigers', 'MEM', 'AAC', 'FBS', 'Memphis, TN', '#003087', '#898d8d', 8, 7, 'Simmons Bank Liberty'],
  ['col_army', 'Army', 'Black Knights', 'ARMY', 'AAC', 'FBS', 'West Point, NY', '#d4bf91', '#000000', 8, 7, 'Michie Stadium'],
  ['col_navy', 'Navy', 'Midshipmen', 'NAVY', 'AAC', 'FBS', 'Annapolis, MD', '#00205b', '#c5b783', 7, 7, 'Navy-Marine Corps'],
  ['col_utsa', 'UTSA', 'Roadrunners', 'UTSA', 'AAC', 'FBS', 'San Antonio, TX', '#0c2340', '#f15a22', 8, 6, 'Alamodome'],
  ['col_ecu', 'East Carolina', 'Pirates', 'ECU', 'AAC', 'FBS', 'Greenville, NC', '#592a8a', '#fdc82f', 7, 6, 'Dowdy-Ficklen'],
  ['col_usf', 'South Florida', 'Bulls', 'USF', 'AAC', 'FBS', 'Tampa, FL', '#006747', '#cfc493', 7, 6, 'Raymond James'],
  ['col_unt', 'North Texas', 'Mean Green', 'UNT', 'AAC', 'FBS', 'Denton, TX', '#00853e', '#ffffff', 8, 5, 'DATCU Stadium'],

  // Sun Belt (FBS)
  ['col_jmu', 'James Madison', 'Dukes', 'JMU', 'Sun Belt', 'FBS', 'Harrisonburg, VA', '#450084', '#cbb677', 8, 7, 'Bridgeforth Stadium'],
  ['col_app', 'App State', 'Mountaineers', 'APP', 'Sun Belt', 'FBS', 'Boone, NC', '#222222', '#ffcc00', 7, 7, 'Kidd Brewer Stadium'],
  ['col_ccu', 'Coastal Carolina', 'Chanticleers', 'CCU', 'Sun Belt', 'FBS', 'Conway, SC', '#006f71', '#a27752', 7, 6, 'Brooks Stadium'],
  ['col_ull', 'Louisiana', 'Ragin Cajuns', 'ULL', 'Sun Belt', 'FBS', 'Lafayette, LA', '#ce181e', '#ffffff', 8, 6, 'Cajun Field'],
  ['col_mrsh', 'Marshall', 'Thundering Herd', 'MRSH', 'Sun Belt', 'FBS', 'Huntington, WV', '#00b140', '#ffffff', 7, 7, 'Joan C. Edwards'],
  ['col_troy', 'Troy', 'Trojans', 'TROY', 'Sun Belt', 'FBS', 'Troy, AL', '#8a2432', '#b3b5b8', 6, 7, 'Veterans Memorial'],
  ['col_gaso', 'Georgia Southern', 'Eagles', 'GASO', 'Sun Belt', 'FBS', 'Statesboro, GA', '#011e41', '#ffffff', 7, 6, 'Paulson Stadium'],
  ['col_txst', 'Texas State', 'Bobcats', 'TXST', 'Sun Belt', 'FBS', 'San Marcos, TX', '#501214', '#8d734a', 7, 6, 'UFCU Stadium'],

  // MAC (FBS)
  ['col_tol', 'Toledo', 'Rockets', 'TOL', 'MAC', 'FBS', 'Toledo, OH', '#15397f', '#ffda00', 7, 7, 'Glass Bowl'],
  ['col_ohio', 'Ohio', 'Bobcats', 'OHIO', 'MAC', 'FBS', 'Athens, OH', '#00694e', '#ffffff', 7, 7, 'Peden Stadium'],
  ['col_mioh', 'Miami (OH)', 'RedHawks', 'MOH', 'MAC', 'FBS', 'Oxford, OH', '#b61e2e', '#ffffff', 7, 7, 'Yager Stadium'],
  ['col_niu', 'Northern Illinois', 'Huskies', 'NIU', 'MAC', 'FBS', 'DeKalb, IL', '#ba0c2f', '#000000', 6, 7, 'Huskie Stadium'],
  ['col_wmu', 'Western Michigan', 'Broncos', 'WMU', 'MAC', 'FBS', 'Kalamazoo, MI', '#6c4023', '#b5a167', 6, 6, 'Waldo Stadium'],
  ['col_bgsu', 'Bowling Green', 'Falcons', 'BGSU', 'MAC', 'FBS', 'Bowling Green, OH', '#fe5000', '#4f2c1d', 7, 6, 'Doyt Perry Stadium'],
  ['col_buff', 'Buffalo', 'Bulls', 'UB', 'MAC', 'FBS', 'Buffalo, NY', '#005bbb', '#ffffff', 6, 6, 'UB Stadium'],

  // C-USA (FBS)
  ['col_lib', 'Liberty', 'Flames', 'LIB', 'C-USA', 'FBS', 'Lynchburg, VA', '#002d62', '#c41230', 8, 7, 'Williams Stadium'],
  ['col_wku', 'Western Kentucky', 'Hilltoppers', 'WKU', 'C-USA', 'FBS', 'Bowling Green, KY', '#c60c30', '#ffffff', 8, 6, 'Houchens-Smith'],
  ['col_jvst', 'Jacksonville State', 'Gamecocks', 'JVST', 'C-USA', 'FBS', 'Jacksonville, AL', '#cc0000', '#ffffff', 7, 6, 'AmFirst Stadium'],
  ['col_shsu', 'Sam Houston', 'Bearkats', 'SHSU', 'C-USA', 'FBS', 'Huntsville, TX', '#fe5100', '#ffffff', 6, 7, 'Bowers Stadium'],
  ['col_latech', 'LA Tech', 'Bulldogs', 'LT', 'C-USA', 'FBS', 'Ruston, LA', '#002f8b', '#e31b23', 6, 6, 'Joe Aillet Stadium'],
  ['col_fiu', 'FIU', 'Panthers', 'FIU', 'C-USA', 'FBS', 'Miami, FL', '#081e3f', '#b6862c', 6, 5, 'Pitbull Stadium'],

  // FCS — Missouri Valley Football Conference (MVFC)
  ['col_ndsu', 'North Dakota State', 'Bison', 'NDSU', 'MVFC', 'FCS', 'Fargo, ND', '#0a5640', '#ffc72a', 8, 8, 'Fargodome'],
  ['col_sdsu_fcs', 'South Dakota State', 'Jackrabbits', 'SDS', 'MVFC', 'FCS', 'Brookings, SD', '#0033a0', '#ffd100', 8, 8, 'Dana J. Dykhouse'],
  ['col_usd', 'South Dakota', 'Coyotes', 'USD', 'MVFC', 'FCS', 'Vermillion, SD', '#ad0000', '#ffffff', 7, 7, 'DakotaDome'],
  ['col_ilst', 'Illinois State', 'Redbirds', 'ILST', 'MVFC', 'FCS', 'Normal, IL', '#ce1126', '#ffffff', 6, 6, 'Hancock Stadium'],
  ['col_uni', 'Northern Iowa', 'Panthers', 'UNI', 'MVFC', 'FCS', 'Cedar Falls, IA', '#4b116f', '#ffcc00', 6, 6, 'UNI-Dome'],
  ['col_ysu', 'Youngstown State', 'Penguins', 'YSU', 'MVFC', 'FCS', 'Youngstown, OH', '#c8102e', '#ffffff', 6, 6, 'Stambaugh Stadium'],

  // FCS — Big Sky
  ['col_mont', 'Montana', 'Grizzlies', 'MONT', 'Big Sky', 'FCS', 'Missoula, MT', '#660033', '#999999', 7, 7, 'Washington-Grizzly'],
  ['col_mtst', 'Montana State', 'Bobcats', 'MTST', 'Big Sky', 'FCS', 'Bozeman, MT', '#00205b', '#b9975b', 8, 7, 'Bobcat Stadium'],
  ['col_ucd', 'UC Davis', 'Aggies', 'UCD', 'Big Sky', 'FCS', 'Davis, CA', '#022851', '#ffbf00', 7, 6, 'UC Davis Health'],
  ['col_ewu', 'Eastern Washington', 'Eagles', 'EWU', 'Big Sky', 'FCS', 'Cheney, WA', '#a10022', '#ffffff', 7, 5, 'Roos Field'],
  ['col_web', 'Weber State', 'Wildcats', 'WEB', 'Big Sky', 'FCS', 'Ogden, UT', '#492365', '#ffffff', 6, 6, 'Stewart Stadium'],
  ['col_idho', 'Idaho', 'Vandals', 'IDHO', 'Big Sky', 'FCS', 'Moscow, ID', '#b3a369', '#000000', 7, 6, 'Kibbie Dome'],

  // FCS — CAA
  ['col_vill', 'Villanova', 'Wildcats', 'VILL', 'CAA', 'FCS', 'Villanova, PA', '#00205b', '#13b5ea', 7, 7, 'Villanova Stadium'],
  ['col_del', 'Delaware', 'Blue Hens', 'DEL', 'CAA', 'FCS', 'Newark, DE', '#00539f', '#ffd200', 7, 6, 'Delaware Stadium'],
  ['col_rich', 'Richmond', 'Spiders', 'RICH', 'CAA', 'FCS', 'Richmond, VA', '#990000', '#000066', 6, 7, 'Robins Stadium'],
  ['col_wm', 'William & Mary', 'Tribe', 'W&M', 'CAA', 'FCS', 'Williamsburg, VA', '#115740', '#b9975b', 6, 6, 'Zable Stadium'],
  ['col_nh', 'New Hampshire', 'Wildcats', 'UNH', 'CAA', 'FCS', 'Durham, NH', '#003591', '#ffffff', 6, 6, 'Wildcat Stadium'],

  // FCS — Ivy League
  ['col_harv', 'Harvard', 'Crimson', 'HARV', 'Ivy', 'FCS', 'Cambridge, MA', '#a51c30', '#1e1e1e', 6, 6, 'Harvard Stadium'],
  ['col_yale', 'Yale', 'Bulldogs', 'YALE', 'Ivy', 'FCS', 'New Haven, CT', '#00356b', '#ffffff', 6, 6, 'Yale Bowl'],
  ['col_prin', 'Princeton', 'Tigers', 'PRIN', 'Ivy', 'FCS', 'Princeton, NJ', '#ee7f2d', '#000000', 6, 6, 'Princeton Stadium'],
  ['col_penn', 'Penn', 'Quakers', 'PENN', 'Ivy', 'FCS', 'Philadelphia, PA', '#990000', '#011f5b', 6, 5, 'Franklin Field'],

  // FCS — SWAC & MEAC
  ['col_jsu', 'Jackson State', 'Tigers', 'JSU', 'SWAC', 'FCS', 'Jackson, MS', '#002147', '#ffffff', 7, 7, 'Mississippi Veterans'],
  ['col_famu', 'Florida A&M', 'Rattlers', 'FAMU', 'SWAC', 'FCS', 'Tallahassee, FL', '#f4811f', '#008344', 7, 6, 'Bragg Memorial'],
  ['col_gram', 'Grambling State', 'Tigers', 'GRAM', 'SWAC', 'FCS', 'Grambling, LA', '#eab308', '#000000', 6, 5, 'Eddie G. Robinson'],
  ['col_how', 'Howard', 'Bison', 'HOW', 'MEAC', 'FCS', 'Washington, DC', '#003a63', '#e51937', 6, 5, 'Greene Stadium'],
  ['col_nccu', 'NC Central', 'Eagles', 'NCCU', 'MEAC', 'FCS', 'Durham, NC', '#8b1e24', '#8b8d8f', 6, 6, 'O Kelly-Riddick'],

  // FCS — SoCon & UAC
  ['col_fur', 'Furman', 'Paladins', 'FUR', 'SoCon', 'FCS', 'Greenville, SC', '#582c83', '#ffffff', 6, 6, 'Paladin Stadium'],
  ['col_merc', 'Mercer', 'Bears', 'MERC', 'SoCon', 'FCS', 'Macon, GA', '#f76800', '#000000', 6, 6, 'Five Star Stadium'],
  ['col_acu', 'Abilene Christian', 'Wildcats', 'ACU', 'UAC', 'FCS', 'Abilene, TX', '#4f2d7f', '#ffffff', 7, 5, 'Wildcat Stadium'],
  ['col_tar', 'Tarleton State', 'Texans', 'TAR', 'UAC', 'FCS', 'Stephenville, TX', '#4f2d7f', '#ffffff', 7, 6, 'Memorial Stadium'],
];

export const COLLEGE_TEAMS: LeagueTeam[] = COLLEGE_SPECS.map((spec, idx) => {
  const [id, name, mascot, shortName, conference, subdivision, city, primary, secondary, offense, defense, stadium] = spec;
  const helmet = id === 'col_nd' ? '#c99700' : id === 'col_uga' || id === 'col_osu' || id === 'col_bama' ? primary : '#ffffff';
  const sameSub = COLLEGE_SPECS.filter((s) => s[5] === subdivision);
  const mySubIdx = sameSub.findIndex((s) => s[0] === id);
  const rivalSpec = sameSub[(mySubIdx + 1) % sameSub.length] ?? COLLEGE_SPECS[(idx + 1) % COLLEGE_SPECS.length];
  return {
    id,
    name: `${name} ${mascot}`,
    shortName,
    mascot,
    city,
    conference,
    division: conference,
    subdivision,
    era: 'COLLEGE',
    offense,
    defense,
    prestige:
      subdivision === 'FCS'
        ? Math.min(3, Math.max(1, Math.round((offense + defense) / 5)))
        : Math.min(5, Math.max(2, Math.round((offense + defense) / 3.8))),
    roof: ['col_ndsu', 'col_usd', 'col_uni', 'col_idho', 'col_utsa'].includes(id) ? 1 : 0,
    rainfall: 32,
    snowfall: ['Big Ten', 'Indep.', 'MW', 'MAC', 'MVFC', 'Big Sky', 'Ivy', 'CAA'].includes(conference) ? 30 : 5,
    uniforms: makeUniforms(primary, secondary, helmet, '#ffffff', id === 'col_bsu' ? '#0033a0' : id === 'col_ewu' ? '#a10022' : primary),
    rivalId: rivalSpec[0],
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
