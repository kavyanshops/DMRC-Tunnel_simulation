import type { DecisionScenario } from './types';

/**
 * Sadar Bazar Water Ingress / Flooding Emergency — Decision Training Scenario Data
 * 
 * Target: Sadar Bazar Stacked Underground Station / Deep Lower Platform & Undercroft
 * Scenario: Groundwater ingress through cross-passage headwall joint during monsoon under high hydraulic head.
 * 
 * DISCLAIMER: Illustrative training framework — pending subject-matter-expert review.
 * All scenario values and telemetry are SIMULATED. Emergency procedures are ASSUMED.
 */
export const FLOODING_DECISION_SCENARIO: DecisionScenario = {
  id: 'flood',
  title: 'Water Ingress — Decision Training',
  type: 'flood',
  summary: 'Groundwater breaches a construction joint near NATM Cross-Passage CP-01 into the deep Lower Undercroft (RL +186.09 m) under 28 m of hydraulic head. Trainees must interpret simulated telemetry, prevent soil fines wash-out beneath sensitive 100-year-old surface heritage buildings, manage track inundation, coordinate polyurethane chemical grouting, and verify safe recovery.',
  initialConditions: {
    location: 'Lower Undercroft / NATM CP-01 Junction (32m below ground)',
    level: 'Lower Base Undercroft (+186.09 m RL)',
    severity: 'Severe Groundwater Inundation & Soil Washout Risk (Simulated)'
  },
  decisionPoints: [
    {
      id: 'FLOOD-DP-01',
      stepNumber: 1,
      timeOffsetSeconds: 30,
      title: 'Sudden Inflow Detection & Sump Pump Escalation',
      situation: 'Station telemetry alerts to rapid water rise in the Lower Sump Pit (RL +186.09 m). Ultrasonic sensor LS-02 indicates water volume rising at 195 L/min. Sump level is at 45% capacity. The groundwater table is at RL +214.50 m, exerting over 2.8 bar of hydrostatic pressure above the lower foundation.',
      telemetry: {
        'Sump Water Level': '48% (Rising)',
        'Inflow Rate': '195 L/min (SIMULATED)',
        'Hydraulic Head': '28.4 m (2.8 bar)',
        'Duty Pump P-1': 'Running',
        'Standby Pump P-2': 'Standby (Auto)'
      },
      affectedZone: 'Lower Undercroft Sump Pit (RL +186.09m)',
      learningObjectiveId: 'OBJ-FLOOD-01',
      explanation: 'Under high hydrostatic pressure (28m head in Delhi quartzite), groundwater breaches can accelerate rapidly. Immediate response requires engaging all redundant sump pumps, notifying civil maintenance, and dispatching inspection teams equipped with gas detectors before track level is threatened.',
      options: [
        {
          text: 'Acknowledge alarm, command standby pump P-2 to active duty, verify discharge line non-return valves, and dispatch civil response crew to locate the breach.',
          isCorrect: true,
          consequences: 'Both pumps run in parallel (400 L/min total capacity). Sump level stabilizes at 52%, preventing immediate overflow into the lower rail trackway.',
          feedback: 'Correct: Maximised dewatering capacity early and initiated physical inspection before track flooding occurred.'
        },
        {
          text: 'Silence the audio alarm and wait for the routine end-of-shift maintenance log to inspect the sump float switch.',
          isCorrect: false,
          consequences: 'Sump overflows within 18 minutes, inundating track ballast and submerging lower rail impedance bonds.',
          feedback: 'Critical Error: Rapid inflow under 28m head cannot be treated as a routine maintenance item.'
        },
        {
          text: 'Turn off duty pump P-1 to prevent pump motor overheating from continuous pumping.',
          isCorrect: false,
          consequences: 'Complete cessation of pumping causes water to flood the entire undercroft and short out technical power panels.',
          feedback: 'Critical Error: Never shut down active drainage pumps during an escalating water ingress event.'
        },
        {
          text: 'Breach the diaphragm wall drainage weep-holes to let water escape into the surrounding rock mass.',
          isCorrect: false,
          consequences: 'Water rushes in with greater velocity from the saturated quartzite, doubling the inflow rate.',
          feedback: 'Critical Error: The rock mass is under 2.8 bar external pressure; opening holes admits more water.'
        }
      ]
    },
    {
      id: 'FLOOD-DP-02',
      stepNumber: 2,
      timeOffsetSeconds: 180,
      title: 'Turbidity, Soil Fines Loss & Heritage Building Risk',
      situation: 'Civil inspection team reports water spurting through the annular joint between NATM CP-01 and the lower tunnel lining. The incoming water is turbid and carrying brown sand/silt. Concurrently, surface tiltmeter TM-03 on the 100-year-old heritage building facade above shows 1.85 mm differential settlement (Warning threshold: 2.0 mm).',
      telemetry: {
        'Water Inflow Rate': '310 L/min',
        'Turbidity / Fines': 'Heavy Silt Transport',
        'Building Tilt TM-03': '1.85 mm (Warning: 2.0 mm)',
        'Surface Settlement': '3.2 mm'
      },
      affectedZone: 'Heritage Corridor Facades / Cross-Passage Joint',
      learningObjectiveId: 'OBJ-FLOOD-02',
      explanation: 'Turbid water indicates ground loss / erosion of the sandy silt layer above the weathered quartzite. Continuous loss of fines creates subterranean voids that can trigger catastrophic settlement or collapse of fragile, century-old heritage masonry structures along the narrow 20-21m corridor.',
      options: [
        {
          text: 'Identify active soil wash-out hazard under heritage structures; prepare emergency fast-set chemical polyurethane injection to seal the joint and alert structural monitoring teams.',
          isCorrect: true,
          consequences: 'Chemical grouting mobilization commences. Surface engineers establish 15-minute settlement measurement cycles to safeguard buildings.',
          feedback: 'Correct: Recognised that fines removal threatens surface buildings, demanding rapid chemical sealing rather than passive dewatering.'
        },
        {
          text: 'Focus only on increasing pumping capacity to drain the water faster, ignoring the silt content in the runoff.',
          isCorrect: false,
          consequences: 'Over 8 cubic meters of subsoil fines are pumped away, causing building TM-03 tilt to exceed 5.5mm and cracking facade masonry.',
          feedback: 'Critical Error: Pumping turbid water without stemming ground loss causes subterranean sinkholes under historical structures.'
        },
        {
          text: 'Excavate the roadway above the building to reduce the weight on the foundation.',
          isCorrect: false,
          consequences: 'Disrupts the congested surface corridor, collapses utility mains, and destabilizes adjacent fragile walls.',
          feedback: 'Critical Error: Unplanned surface excavation aggravates ground movement in heritage zones.'
        }
      ]
    },
    {
      id: 'FLOOD-DP-03',
      stepNumber: 3,
      timeOffsetSeconds: 360,
      title: 'Lower Rail Submergence & Traffic Protection',
      situation: 'Inflow reaches 360 L/min. Sump discharge line suffers partial cavitation backpressure. Water begins pooling on the Lower Rail track slab (RL +187.90 m). Water depth over the rail crown reaches 125 mm (Critical threshold: 150 mm). An empty non-revenue test train is 800m away approaching Sadar Bazar on the lower line.',
      telemetry: {
        'Track Water Depth': '125 mm above rail',
        'Lower Rail Level': '+187.90 m RL',
        'Approaching Train': 'Test Train 801 (800m)',
        'Signaling Track Circuit': 'Degraded (Shunting)'
      },
      affectedZone: 'Lower Platform Trackway (RL +187.90m)',
      learningObjectiveId: 'OBJ-FLOOD-03',
      explanation: 'Water exceeding 100mm over rail level can submerge signaling impedance bonds and short traction return circuits. Exceeding 150mm poses risk of bogie equipment submergence and derailment. The line must be closed to traffic and traction power isolated in the flooded zone.',
      options: [
        {
          text: 'Issue emergency stop command to approaching Train 801, impose Red signal hold, halt all movements into the lower line, and isolate trackside electrical equipment before water reaches 150mm.',
          isCorrect: true,
          consequences: 'Train 801 halts safely before the station. Signaling and traction assets are protected from catastrophic water short-circuiting.',
          feedback: 'Correct: Strictly enforced railway operational safety rules regarding track submergence and electrical isolation.'
        },
        {
          text: 'Allow Train 801 to pass through at full speed to push the pooled water away from the platform with its front deflector.',
          isCorrect: false,
          consequences: 'High-speed water displacement causes aquaplaning, shorts the traction inverter, and strands the train over the flooded switch.',
          feedback: 'Critical Error: Metro trains are not designed to plow through flood waters; this creates severe derailment risk.'
        },
        {
          text: 'Divert the flood water into the passenger elevator pit to keep the rails clear.',
          isCorrect: false,
          consequences: 'Elevator shaft fills with water, destroying hydraulic/cable machinery and trapping equipment.',
          feedback: 'Critical Error: Never sacrifice passenger vertical transit shafts to drain track flooding.'
        }
      ]
    },
    {
      id: 'FLOOD-DP-04',
      stepNumber: 4,
      timeOffsetSeconds: 600,
      title: 'High-Pressure Chemical Grouting Sealing',
      situation: 'The emergency grouting team arrives at the leaking cross-passage annular segment. Water is jetting at 2.6 bar through a 15mm fissure. The grouting specialist asks for direction on packer placement and chemical resin selection.',
      telemetry: {
        'Joint Fissure Width': '15 mm',
        'Water Pressure': '2.6 bar',
        'Selected Material': 'Hydrophobic Polyurethane',
        'Adjacent Liner Stress': 'Within Limits'
      },
      affectedZone: 'NATM Cross-Passage CP-01 Ring 2 Joint',
      learningObjectiveId: 'OBJ-FLOOD-04',
      explanation: 'Under high hydrostatic inflow, fast-reacting hydrophobic polyurethane resin that expands in contact with water is the standard solution. Drill holes diagonally across the joint, install mechanical packers with one-way valves, inject from lowest to highest, and monitor adjacent segment strain.',
      options: [
        {
          text: 'Install mechanical injection packers diagonally intersecting the joint, open bleeder valve to relieve pressure during setting, inject hydrophobic polyurethane resin incrementally, and monitor adjacent segment joints.',
          isCorrect: true,
          consequences: 'Polyurethane reacts with water to form a dense closed-cell elastic foam. Inflow drops from 360 L/min to under 5 L/min within 12 minutes.',
          feedback: 'Correct: Executed industry-standard NATM/TBM water-stopping methodology without damaging segmental lining rings.'
        },
        {
          text: 'Drive dry wooden wedges into the gap with a sledgehammer to plug the hole instantly.',
          isCorrect: false,
          consequences: 'Water pressure blows the wedges out with violent force, fracturing the edge of the precast concrete segment.',
          feedback: 'Critical Error: Mechanical wooden wedges cannot resist 2.6 bar hydrostatic pressure and fracture concrete edges.'
        },
        {
          text: 'Inject quick-setting Portland cement without packers under 15 bar pressure.',
          isCorrect: false,
          consequences: 'High uncalibrated pressure creates hydraulic fracturing of the surrounding weathered quartzite and washes cement into the sump.',
          feedback: 'Critical Error: Excessive injection pressure causes secondary rock fracture and destroys segment seals.'
        }
      ]
    },
    {
      id: 'FLOOD-DP-05',
      stepNumber: 5,
      timeOffsetSeconds: 900,
      title: 'Structural Verification & Resumption Criteria',
      situation: 'Chemical grouting has cured successfully. Leakage has ceased (< 2 L/min seepage collected in channel). Drainage pumps have cleared all pooled track water. The Site Engineer and Operations Controller must determine the conditions required before re-opening the lower line.',
      telemetry: {
        'Residual Ingress': '< 2 L/min (Nominal)',
        'Track Water Level': '0 mm (Dry)',
        'Building Tilt TM-03': '1.87 mm (Stable)',
        'Track Circuit Health': 'Testing Required'
      },
      affectedZone: 'Entire Lower Station Box & Tunnel Sector',
      learningObjectiveId: 'OBJ-FLOOD-05',
      explanation: 'Return-to-service after an underground inundation requires comprehensive electrical insulation resistance (megger) testing, signaling point machine dry-out verification, structural inspection of grouted segments, and continuous automated geotechnical monitoring for 72 hours.',
      options: [
        {
          text: 'Perform megger insulation testing on all trackside signaling and traction cabling, verify segment structural integrity, and maintain 72-hour continuous geotechnical monitoring before restoring full revenue traffic.',
          isCorrect: true,
          consequences: 'Signaling integrity confirmed. Heritage building tilt remains stable. Lower platform safely reauthorized for revenue service.',
          feedback: 'Correct: Comprehensive engineering validation ensures safe, reliable rail operations following a major ingress event.'
        },
        {
          text: 'Immediately restore full-speed passenger train service as soon as the floor appears dry without electrical checks.',
          isCorrect: false,
          consequences: 'Moisture in switch point machine causes signaling failure and track circuit breakdown during morning peak rush.',
          feedback: 'Critical Error: Water contact degrades electrical equipment; testing is mandatory before running trains.'
        },
        {
          text: 'Permanently deactivate the sump pumps now that the joint is sealed.',
          isCorrect: false,
          consequences: 'Normal seasonal groundwater seepage gradually accumulates unnoticed, flooding the undercroft within 48 hours.',
          feedback: 'Critical Error: Underground metro stations depend on operational sump pumps throughout their operational lifespan.'
        }
      ]
    }
  ]
};
