function pid(config, state, error) {
  state.integrator += error;

  // integrator saturation
  if(Math.abs(state.integrator)>config.integratorSaturation) {
    state.integrator = Math.sign(state.integrator) * config.integratorSaturation;
  }

  // flush integrator on zero-crossing
  if(Math.sign(error)!=Math.sign(state.lastError)) {
    state.integrator = 0.0;
  }

  state.lastError = error;

  //console.log('state: '+JSON.stringify(state));

  if(Math.abs(error) < config.precision) {
    return 0.0;
  }

  return config.p * error + config.i * state.integrator ;
}

autopilotState = {
  pidInterval: 100,

  lastPosition: {
    x: 0.0,
    y: 0.0,
    z: 0.0
  },

  rotationPidConfig: {
    p: 0.8,
    i: 0.1,
    precision: 0.2,
    integratorSaturation: 10
  },

  translationPidConfig: {
    p: 0.0002,
    i: 0.0001,
    precision: 0,
    integratorSaturation: 1
  },

  rangePidConfig: {
    p: 0.00005,
    i: 0.00001,
    precision: 0,
    integratorSaturation: 1
  },

  rollPidState: {
    integrator: 0.0,
    lastError: 0.0
  },

  yawPidState: {
    integrator: 0.0,
    lastError: 0.0
  },

  pitchPidState: {
    integrator: 0.0,
    lastError: 0.0
  },

  upDownPidState: {
    integrator: 0.0,
    lastError: 0.0
  },

  leftRightPidState: {
    integrator: 0.0,
    lastError: 0.0
  },

  rangePidState: {
    integrator: 0.0,
    lastError: 0.0
  }
}

function autopilotRoll() {
  let control = pid(autopilotState.rotationPidConfig, autopilotState.rollPidState, parseFloat(fixedRotationZ));
  //console.log("Autopilot roll control: "+control);

  if(Math.abs(control-rateRotationZ)>=1) {
    if(control<rateRotationZ) {
      rollLeft();
    } else {
      rollRight();
    }
  }
}

function autopilotYaw() {
  let control = pid(autopilotState.rotationPidConfig, autopilotState.yawPidState, parseFloat(fixedRotationY));
  //console.log("Autopilot yaw control: "+control);

  if(Math.abs(control-rateRotationY)>=1) {
    if(control<rateRotationY) {
      yawLeft();
    } else {
      yawRight();
    }
  }
}

function autopilotPitch() {
  let control = pid(autopilotState.rotationPidConfig, autopilotState.pitchPidState, parseFloat(fixedRotationX));
  //console.log("Autopilot pitch control: "+control);

  if(Math.abs(control-rateRotationX)>=1) {
    if(control<rateRotationX) {
      pitchUp();
    } else {
      pitchDown();
    }
  }
}

function autopilotUpDown() {
  // position naming as in HUD
  let positionZ = camera.position.y-issObject.position.y;
  let positionX = camera.position.z-issObject.position.z;

  let speedZ = (positionZ - autopilotState.lastPosition.z)/autopilotState.pidInterval;

  let control = -pid(autopilotState.translationPidConfig, autopilotState.upDownPidState, positionZ);
  // console.log('Speed Z: ', speedZ, ' positionZ: ', positionZ);
  // console.log('Autopilot up/down control: '+control);

  let hysteresis = 0.0005;
  if (positionX < 50) {
    hysteresis = 0.0001;
  }
  if (positionX < 2) {
    hysteresis = 0.00005;
  }

  if (Math.abs(control-speedZ) > hysteresis) {
    if (control>speedZ) {
      translateUp();
    } else {
      translateDown();
    }
  }

  autopilotState.lastPosition.z = positionZ;
}

function autopilotLeftRight() {
  // position naming as in HUD
  positionY = camera.position.x-issObject.position.x;
  speedY = (positionY - autopilotState.lastPosition.y)/autopilotState.pidInterval;
  positionX = camera.position.z-issObject.position.z;

  let control = -pid(autopilotState.translationPidConfig, autopilotState.leftRightPidState, positionY);
  // console.log('Speed Y: ', speedY, ' positionY: ', positionY);
  // console.log('Autopilot left/right control: '+control);

  let hysteresis = 0.0005;
  if (positionX < 50) {
    hysteresis = 0.0001;
  }
  if (positionX < 2) {
    hysteresis = 0.00005;
  }

  if (Math.abs(control-speedY) > hysteresis) {
    if (control > speedY) {
      translateRight();
    } else {
      translateLeft();
    }
  }

  autopilotState.lastPosition.y = positionY;
}

function autopilotRange() {
  // position naming as in HUD
  let positionX = camera.position.z-issObject.position.z;
  // stop 0.2 meter in front of the dock
  positionX -= 0.2
  let speedX = (positionX - autopilotState.lastPosition.x)/autopilotState.pidInterval;

  let control = -pid(autopilotState.rangePidConfig, autopilotState.rangePidState, positionX);

  //console.log('Speed X: ', speedX, ' positionX: ', positionX);
  //console.log('Autopilot range control: '+control);

  // warp speed in the beginning
  if (positionX > 100) {
    control=-0.05;
  }

  let hysteresis = 0.005;
  if (positionX < 50) {
    hysteresis = 0.0005;
  }
  if (positionX < 3) {
    hysteresis = 0.0001;
  }

  if (Math.abs(control-speedX) > hysteresis) {
    if(control>speedX) {
      translateBackward();
    } else {
      translateForward();
    }
  }

  autopilotState.lastPosition.x = positionX;
}

function autopilot() {
  let positionX = camera.position.z-issObject.position.z;

  // adjust controls precision
  if (positionX>5 && translationPulseSize==0.001) {
    toggleTranslation();
  }
  if(positionX<5 && translationPulseSize==0.005) {
    toggleTranslation();
  }

  autopilotPitch();
  autopilotYaw();
  autopilotRoll();
  autopilotUpDown();
  autopilotLeftRight();
  autopilotRange();
};

var autopilotInterval = setInterval(autopilot, autopilotState.pidInterval);
//clearInterval(autopilotInterval)
