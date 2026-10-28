import type { DecisionScenario } from './types';

/**
 * Sadar Bazar Fire Emergency — Decision Training Scenario Data
 * 
 * Target: Sadar Bazar Stacked Underground Station / Upper TBM Running Tunnel
 * Scenario: Maintenance battery flatcar fire during non-traffic hours / pre-commissioning.
 * 
 * DISCLAIMER: Illustrative training framework — pending subject-matter-expert review.
 * All scenario values and telemetry are SIMULATED. Emergency procedures are ASSUMED.
 */
export const FIRE_DECISION_SCENARIO: DecisionScenario = {
  id: 'fire',
  title: 'Fire Emergency — Decision Training',
  type: 'fire',
  summary: 'A battery flatcar fire erupts in the Upper TBM Running Tunnel 45 m north of Sadar Bazar station headwall. Trainees must navigate 5 critical decision points: initial worker evacuation and ventilation mode, smoke back-layering control, cross-passage door pressurisation, 25kV traction earthing for fire crews, and post-incident gas clearance verification.',
  initialConditions: {
    location: 'Upper TBM Running Tunnel (Ch 120, 45m from Headwall)',
    level: 'Upper Rail Level (+202.60 m RL / 17.40 m depth)',
    severity: 'High Thermal & Toxic Smoke Hazard (Simulated)'
  },
  decisionPoints: [
    {
      id: 'FIRE-DP-01',
      stepNumber: 1,
      timeOffsetSeconds: 30,
      title: 'Initial Detection & Worker Evacuation',
      situation: 'Optical smoke sensor FS-102 alarms in the Upper TBM Tunnel. CCTV confirms thick smoke and flames from a battery locomotive flatcar 45m from the station box. Three track maintenance workers are 20m downstream of the fire. Natural tunnel draft is pushing smoke toward them.',
      telemetry: {
        'CO Concentration': '45 ppm',
        'Ambient Temp': '38 °C',
        'Optical Visibility': '65%',
        'Airflow Velocity': '0.4 m/s (natural)'
      },
      affectedZone: 'Upper TBM Tunnel (Ch 100 to Ch 160)',
      learningObjectiveId: 'OBJ-FIRE-01',
      explanation: 'Underground tunnel fires produce rapid smoke stratification and toxic gases. Life safety dictates immediate worker egress toward the nearest fire-rated cross-passage and activating mechanical push-pull ventilation away from retreating workers while isolating traction power.',
      options: [
        {
          text: 'Order workers to evacuate immediately toward NATM Cross-Passage CP-01, activate push-pull tunnel ventilation away from the egress path, and initiate 25kV traction power trip.',
          isCorrect: true,
          consequences: 'Workers retreat toward safe cross-passage. Ventilation pushes smoke plume northward away from their path.',
          feedback: 'Correct: Prioritised human life safety and established directional smoke control toward the exhaust shaft.'
        },
        {
          text: 'Instruct the 3 workers to approach the burning flatcar with 5kg dry powder extinguishers to extinguish the battery before retreating.',
          isCorrect: false,
          consequences: 'Workers are overcome by toxic battery off-gas and dense smoke within 90 seconds, sustaining respiratory injury.',
          feedback: 'Critical Error: Battery chemical fires cannot be controlled with portable extinguishers and release deadly hydrogen fluoride and carbon monoxide.'
        },
        {
          text: 'Reverse tunnel ventilation toward the Sadar Bazar station concourse to blow smoke out through the passenger entrances.',
          isCorrect: false,
          consequences: 'Smoke rapidly invades the station box concourse and platform levels, destroying secondary egress visibility.',
          feedback: 'Critical Error: Never direct tunnel smoke into passenger station areas or active evacuation zones.'
        },
        {
          text: 'Wait for temperature sensors to exceed 70°C before declaring an emergency to rule out dust false-alarms.',
          isCorrect: false,
          consequences: 'Delay allows smoke back-layering to engulf 80m of the tunnel, cutting off escape routes.',
          feedback: 'Critical Error: Optical confirmation with CCTV demands immediate action; heat lag in tunnel fires is fatal.'
        }
      ]
    },
    {
      id: 'FIRE-DP-02',
      stepNumber: 2,
      timeOffsetSeconds: 120,
      title: 'Smoke Back-Layering & Critical Velocity Control',
      situation: 'The fire intensity escalates rapidly to 8 MW. Upper tunnel anemometer AM-04 indicates airflow velocity has dropped to 1.1 m/s due to buoyant smoke back-pressure. A thermal smoke layer is moving upstream against the ventilation direction toward Cross-Passage CP-01.',
      telemetry: {
        'CO Concentration': '190 ppm',
        'Ambient Temp': '92 °C',
        'Airflow Velocity': '1.1 m/s',
        'Critical Velocity Req.': '2.2 m/s'
      },
      affectedZone: 'Upper Tunnel Headwall to CP-01',
      learningObjectiveId: 'OBJ-FIRE-02',
      explanation: 'Smoke back-layering occurs when buoyant forces exceed ventilation momentum. In Sadar Bazar 5.8m internal diameter bored tunnels, critical velocity (~2.2 m/s) must be maintained by boosting tunnel jet fans to force smoke unidirectionally toward the extraction point.',
      options: [
        {
          text: 'Increase booster jet fan bank JF-01/04 to full capacity to achieve critical air velocity (>2.2 m/s), suppressing smoke back-layering over the escape path.',
          isCorrect: true,
          consequences: 'Airspeed increases to 2.4 m/s. The smoke front is pushed back and contained downstream, keeping the cross-passage approach clear.',
          feedback: 'Correct: Overcoming critical velocity is the fundamental principle of tunnel emergency smoke management.'
        },
        {
          text: 'Shut off all tunnel ventilation fans immediately to starve the fire of fresh oxygen.',
          isCorrect: false,
          consequences: 'Zero airflow causes smoke and heat to mushroom symmetrically in both directions, trapping workers at the cross-passage.',
          feedback: 'Critical Error: In rail tunnels, starving a fire by cutting ventilation suffocates occupants before extinguishing flames.'
        },
        {
          text: 'Open all cross-passage doors and leave them propped open to allow air draft between upper and lower tunnels.',
          isCorrect: false,
          consequences: 'Toxic smoke and thermal gases draft directly into the Lower Running Tunnel (+187.90m RL), contaminating both levels.',
          feedback: 'Critical Error: Breaching cross-passage doors compromises the primary compartmentation barrier.'
        }
      ]
    },
    {
      id: 'FIRE-DP-03',
      stepNumber: 3,
      timeOffsetSeconds: 270,
      title: 'Cross-Passage Ingress & Compartmentation',
      situation: 'All 3 workers have reached NATM Cross-Passage CP-01. Smoke is collecting at the door threshold in the upper tunnel. The cross-passage pressurisation fan (PPF-01) is operational. Trainees must direct the transfer into the lower tunnel.',
      telemetry: {
        'CO Concentration': '280 ppm (Upper)',
        'Differential Pressure': '+25 Pa (CP)',
        'Lower Tunnel CO': '< 5 ppm',
        'Door Status': 'Open'
      },
      affectedZone: 'NATM Cross-Passage CP-01 (Ø4.10m)',
      learningObjectiveId: 'OBJ-FIRE-03',
      explanation: 'Cross-passages serve as temporary points of safety. Positive pressurisation (+20 to +50 Pa relative to incident bore) prevents smoke ingress when fire doors open. Doors must be closed immediately after entry to prevent contamination of the non-incident tunnel.',
      options: [
        {
          text: 'Verify all workers enter CP-01, latch the upper fire door shut immediately, check positive pressure differential (>20 Pa), and proceed down to the Lower Tunnel.',
          isCorrect: true,
          consequences: 'Fire door seals shut. Positive pressure halts smoke penetration. Workers reach the fresh-air Lower Platform safely.',
          feedback: 'Correct: Adhered to emergency egress discipline and maintained physical fire compartment integrity.'
        },
        {
          text: 'Leave the upper cross-passage door open so fire crews can see where the workers went.',
          isCorrect: false,
          consequences: 'Heavy smoke enters the 4.10m cross-passage, tripping Lower Tunnel optical alarms and blinding escaping workers.',
          feedback: 'Critical Error: Fire doors must never remain open; emergency crews use station thermal imaging and radio locators.'
        },
        {
          text: 'Order the workers to reverse back out into the upper tunnel and run towards the Sadar Bazar station box.',
          isCorrect: false,
          consequences: 'Workers collapse from carbon monoxide inhalation within 15 meters of leaving the cross-passage vestibule.',
          feedback: 'Critical Error: Never turn occupants back into a contaminated, high-temperature smoke plume.'
        }
      ]
    },
    {
      id: 'FIRE-DP-04',
      stepNumber: 4,
      timeOffsetSeconds: 420,
      title: 'Traction Power Isolation & Emergency Services Handover',
      situation: 'Delhi Fire Service (DFS) appliances have arrived at Sadar Bazar station surface access. Fire crew incident commander requests permission to deploy water branches into the upper tunnel. Upper 25kV OHE traction line breaker tripped on overcurrent at T=00:45.',
      telemetry: {
        '25kV Breaker': 'Tripped (Open)',
        'Residual Voltage': 'Unverified',
        'OHE Status': 'Permit Pending',
        'DFS Crew': 'Staged at Shaft'
      },
      affectedZone: 'Upper Traction Sub-sector 4A',
      learningObjectiveId: 'OBJ-FIRE-04',
      explanation: 'Overhead traction catenary retains induced and residual capacitive charge even after substation breakers trip. Applying water hoses near high-voltage rail infrastructure requires positive physical earthing, verified zero-voltage, and a formal Permit to Work (PTW).',
      options: [
        {
          text: 'Coordinate with Traction Power Controller (TPC) to apply track section earthing switches, verify zero potential with voltage detector, and issue formal Permit to Work (PTW) before DFS water spray.',
          isCorrect: true,
          consequences: 'OHE is grounded safely. PTW is executed. DFS crews advance with water spray without electrocution hazard.',
          feedback: 'Correct: Followed strict metro electrical safety rules. High-voltage catenary must always be proved dead and earthed.'
        },
        {
          text: 'Authorize DFS crews to commence water application immediately because the substation breaker is already tripped.',
          isCorrect: false,
          consequences: 'Induced voltage in overhead catenary creates a severe electric shock hazard for the lead firefighting branchman.',
          feedback: 'Critical Error: Tripped breakers do not guarantee safety; overhead lines can carry lethal induced charge.'
        },
        {
          text: 'Re-close the 25kV breaker for 10 seconds to test whether the fault was cleared by the fire.',
          isCorrect: false,
          consequences: 'Arc flash explosion at the burning battery flatcar ignites fuel vapors and destroys tunnel electrical conduit.',
          feedback: 'Critical Error: Re-energising an active incident zone is a catastrophic safety violation.'
        }
      ]
    },
    {
      id: 'FIRE-DP-05',
      stepNumber: 5,
      timeOffsetSeconds: 720,
      title: 'Post-Incident Gas Purge & Safe Re-entry Verification',
      situation: 'DFS has extinguished the flatcar fire and overhauled remaining hot-spots. Tunnel ambient temperature has returned to 31°C. The Station Controller must establish the condition under which inspection teams may safely enter the upper tunnel.',
      telemetry: {
        'CO Concentration': '32 ppm (Decreasing)',
        'H2S / VOC': 'Trace',
        'Oxygen (O2)': '20.4%',
        'Tunnel Temp': '31 °C'
      },
      affectedZone: 'Entire Upper Tunnel Alignment',
      learningObjectiveId: 'OBJ-FIRE-05',
      explanation: 'Underground rail fire recovery requires continuous positive ventilation purge until calibrated portable gas multi-detectors confirm CO < 25 ppm, toxic combustion gases are within OSHA/DMRC limits, and structural inspection approves tunnel crown integrity.',
      options: [
        {
          text: 'Maintain high-rate tunnel ventilation purge and permit entry only after calibrated gas monitoring confirms CO < 25 ppm and atmosphere is certified safe by the Safety Controller.',
          isCorrect: true,
          consequences: 'Residual combustion gases are swept out of the crown. Safety engineer certifies tunnel safe for structural survey.',
          feedback: 'Correct: Strict adherence to atmospheric safety criteria protects post-incident investigative and recovery personnel.'
        },
        {
          text: 'Immediately declare all-clear and restore scheduled train operations since the flames are extinguished.',
          isCorrect: false,
          consequences: 'Residual carbon monoxide accumulates in low air-flow pockets, sickening track inspection crew.',
          feedback: 'Critical Error: Extinguished flames do not equate to a breathable atmosphere; toxic gases persist without thorough purging.'
        },
        {
          text: 'Shut down all ventilation fans to save standby generator fuel as soon as firefighters exit the tunnel.',
          isCorrect: false,
          consequences: 'Hot gases and smoke recirculate into the concourse through the open access shaft.',
          feedback: 'Critical Error: Post-incident ventilation must run continuously until air quality tests pass.'
        }
      ]
    }
  ]
};
