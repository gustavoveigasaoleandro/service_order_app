import serviceOrder from "../models/serviceOrder";

export class serviceOrderManager {
  static async listServices(conditions: any = {}) {
    return await serviceOrder.findAll(conditions);
  }

  static async createService(serviceData: any, transaction: any) {
    return await serviceOrder.create(serviceData, { transaction });
  }

  static async findService(conditions: any) {
    return await serviceOrder.findOne(conditions);
  }

  static async updateService(
    existingService: any,
    serviceData: any,
    transaction: any
  ) {
    return await existingService.update(serviceData, { transaction });
  }
}
