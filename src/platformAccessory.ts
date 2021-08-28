import got from 'got';
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';
import { Aida64HomebridgePlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class GPUFanPlatformAccessory {
  private service: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private accessoryState = {
    On: true,
    RotationSpeed: 0,
    GPUTemp: 0,
  };

  constructor(
    private readonly platform: Aida64HomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Jiayin')
      .setCharacteristic(this.platform.Characteristic.Model, '3080')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, '66666');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Fan) || this.accessory.addService(this.platform.Service.Fan);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.deviceName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .onGet(this.getOn.bind(this));               // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.RotationSpeed)
      // .onSet(this.setRotationSpeed.bind(this))      // SET - bind to the 'setBrightness` method below
      .onGet(this.getRotationSpeed.bind(this));

    const temperatureSensorName = 'GPU temperature';
    const temperatureSensorService = this.accessory.getService(temperatureSensorName) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor, temperatureSensorName, temperatureSensorName);
    temperatureSensorService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getGPUTemerature.bind(this));

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */

    // // Example: add two "motion sensor" services to the accessory
    // const motionSensorOneService = this.accessory.getService('Motion Sensor One Name') ||
    //   this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor One Name', 'YourUniqueIdentifier-1');

    // const motionSensorTwoService = this.accessory.getService('Motion Sensor Two Name') ||
    //   this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor Two Name', 'YourUniqueIdentifier-2');

    // /**
    //  * Updating characteristics values asynchronously.
    //  *
    //  * Example showing how to update the state of a Characteristic asynchronously instead
    //  * of using the `on('get')` handlers.
    //  * Here we change update the motion sensor trigger states on and off every 10 seconds
    //  * the `updateCharacteristic` method.
    //  *
    //  */
    // let motionDetected = false;
    this.updateInfoFromHttp();
    setInterval(() => {
      this.updateInfoFromHttp();
    }, 3000);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  async setOn(value: CharacteristicValue) {
    // implement your own code to turn your device on/off
    // this.accessoryState.On = value as boolean;

    this.platform.log.debug('Set Characteristic On ->', value);
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getOn(): Promise<CharacteristicValue> {
    // implement your own code to check if the device is on
    const isOn = this.accessoryState.RotationSpeed >= 0;

    this.platform.log.debug('Get Characteristic On ->', isOn);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return isOn;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async setRotationSpeed(value: CharacteristicValue) {
    // implement your own code to set the brightness
    // this.accessoryState.RotationSpeed = value as number;

    this.platform.log.debug('Set Characteristic Brightness -> ', value);
  }

  async getRotationSpeed(): Promise<CharacteristicValue> {
    // this.platform.log.debug('Get Characteristic RotationSpeed');
    return this.accessoryState.RotationSpeed;
  }

  async getGPUTemerature(): Promise<CharacteristicValue> {
    // this.platform.log.debug('Get Characteristic RotationSpeed');
    return this.accessoryState.GPUTemp;
  }

  async updateInfoFromHttp() {
    try {
      const response = await got('http://192.168.0.112:5556/system_info', {responseType: 'text'});
      // this.platform.log.info('getting HTTP response:', response);
      const params = JSON.parse(response.body);
      this.accessoryState.RotationSpeed = params.DGPU1.value;
      this.accessoryState.GPUTemp = params.TGPU1.value;
    } catch (error) {
      this.platform.log.info('HTTP error:', error);
    }
  }

}
