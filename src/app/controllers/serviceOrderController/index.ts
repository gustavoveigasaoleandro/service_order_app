import { Request, Response } from "express";
import tryCatch from "../../decorators/tryCatch";
import Joi from "joi";
import { INVALID_FIELDS, INVALID_ROLE } from "../../constants/errorCodes";
import { sequelize } from "../../models";
import {
  isValidResponse,
  sendMessageAndWaitForResponse,
  validateAndAuthorize,
} from "../../utils/validateAndAuthorize";
import AppError from "../../appError";
import { serviceOrderManager } from "../../services/serviceOrder";
import { Op } from "sequelize";

export class ServiceOrderController {
  @tryCatch()
  static async addServiceOrder(
    req: Request,
    res: Response
  ): Promise<Response<any>> {
    const schema = Joi.object({
      serviceOrder: {
        initial_date: Joi.date().iso().min("now").required(),
        delivery_declaration: Joi.string().required(),
        client_id: Joi.number().integer().required(),
        problem: Joi.string().required(),
      },
    });

    const { error } = schema.validate(req.body);
    if (error) {
      throw new AppError(INVALID_FIELDS, "invalid transaction structure", 400);
    }

    const transaction = await sequelize.transaction();

    const access = await validateAndAuthorize(req, res);

    // Verifica se o tipo de `access` é `ValidResponse`
    if (isValidResponse(access)) {
      const validation = await sendMessageAndWaitForResponse(
        req,
        res,
        "verification.service_order_ex",
        "",
        { client_id: req.body.serviceOrder.client_id },
        "service_order_verification",
        "verification.response_service_order_ex",
        "verification.response_service_order"
      );
      if (validation.role === "CLIENT") {
        const newServiceOrder = await serviceOrderManager.createService(
          {
            ...req.body.serviceOrder,
            companie_id: access.companyId,
            technician_id: access.userId,
            status: "Received",
          },
          transaction
        );

        await transaction.commit();

        return res.status(201).json({
          message: "Service order created successfully.",
          serviceOrder: newServiceOrder,
        });
      } else {
        throw new AppError(INVALID_ROLE, "UNKNOWN CLIENT", 400);
      }
    } else {
      // Se for uma resposta do tipo HTTP, retorna diretamente
      return access;
    }
  }

  @tryCatch()
  static async updateServiceOrder(
    req: Request,
    res: Response
  ): Promise<Response<any>> {
    const schema = Joi.object({
      serviceOrder: Joi.object({
        id: Joi.number().integer().required(),
        status: Joi.string().valid("inProgress", "completed").required(),
        final_date: Joi.date().iso().optional(),
        return_declaration: Joi.string().optional(),
        hours: Joi.number().integer().optional(),
        items: Joi.array()
          .items(
            Joi.object({
              item_id: Joi.number().integer().required(),
              amount: Joi.number().integer().positive().required(),
            })
          )
          .optional(),
      }).required(),
    });

    const { error } = schema.validate(req.body);
    if (error) {
      console.log(error);
      throw new AppError(
        INVALID_FIELDS,
        "Invalid service order structure",
        400
      );
    }

    const transaction = await sequelize.transaction();

    const access = await validateAndAuthorize(req, res);

    if (isValidResponse(access)) {
      const existingServiceOrder = await serviceOrderManager.findService({
        where: { id: req.body.serviceOrder.id, companie_id: access.companyId },
      });

      if (
        !existingServiceOrder ||
        existingServiceOrder.status === "delivered"
      ) {
        await transaction.rollback();
        throw new AppError(
          INVALID_FIELDS,
          `Service order with ID '${req.body.serviceOrder.id}' not found.`,
          404
        );
      }

      if (req.body.serviceOrder.status === "inProgress") {
        // Verifica se o status anterior era "completed" e apaga os campos relacionados
        if (existingServiceOrder.status === "completed") {
          if (existingServiceOrder.dataValues.transactionIds) {
            const validation = await sendMessageAndWaitForResponse(
              req,
              res,
              "service_order.stock_ex",
              "",
              {
                companie_id: existingServiceOrder.dataValues.companie_id,
                technician_id: existingServiceOrder.dataValues.technician_id,
                client_id: existingServiceOrder.dataValues.client_id,
                items: [],
                transactionIds: existingServiceOrder.dataValues.transactionIds,
              },
              "",
              "service_order.stock_response_ex",
              "service_order.stock_response"
            );

            if (validation.error) {
              await transaction.rollback();
              throw new AppError(
                INVALID_FIELDS,
                "Stock validation failed for one or more items.",
                400
              );
            }
          }

          await serviceOrderManager.updateService(
            existingServiceOrder,
            {
              status: "inProgress",
              final_date: null,
              return_declaration: null,
              hours: null,
            },
            transaction
          );
        } else {
          await serviceOrderManager.updateService(
            existingServiceOrder,
            { status: "inProgress" },
            transaction
          );
        }
      } else if (req.body.serviceOrder.status === "completed") {
        if (
          !req.body.serviceOrder.final_date ||
          !req.body.serviceOrder.return_declaration ||
          !req.body.serviceOrder.hours ||
          !req.body.serviceOrder.items
        ) {
          await transaction.rollback();
          throw new AppError(
            INVALID_FIELDS,
            "Final date, return declaration, hours, and items are required when marking a service order as completed.",
            400
          );
        }

        // Envia os itens para verificação no RabbitMQ
        const validation = await sendMessageAndWaitForResponse(
          req,
          res,
          "service_order.stock_ex",
          "",
          {
            companie_id: existingServiceOrder.dataValues.companie_id,
            technician_id: existingServiceOrder.dataValues.technician_id,
            client_id: existingServiceOrder.dataValues.client_id,
            items: req.body.serviceOrder.items,
            transactionIds: existingServiceOrder.dataValues.transactionIds
              ? existingServiceOrder.dataValues.transactionIds
              : [],
          },
          "",
          "service_order.stock_response_ex",
          "service_order.stock_response"
        );
        if (validation.error) {
          await transaction.rollback();
          throw new AppError(INVALID_FIELDS, validation.error, 400);
        }

        await serviceOrderManager.updateService(
          existingServiceOrder,
          {
            status: "completed",
            transactionIds: validation.transactionIds,
            final_date: req.body.serviceOrder.final_date,
            return_declaration: req.body.serviceOrder.return_declaration,
            hours: req.body.serviceOrder.hours,
          },
          transaction
        );
      }
      await transaction.commit();
      return res.status(200).json({
        message: "Service order updated successfully.",
      });
    } else {
      return access;
    }
  }

  @tryCatch()
  static async listServiceOrders(
    req: Request,
    res: Response
  ): Promise<Response<any>> {
    const schema = Joi.object({
      client_id: Joi.number().integer().optional(),
      initial_date: Joi.date().iso().optional(),
      final_date: Joi.date().iso().optional(),
      status: Joi.string()
        .valid("Received", "inProgress", "completed", "delivered")
        .optional(),
      total_value_gte: Joi.number().optional(), // total_value maior ou igual
      total_value_lte: Joi.number().optional(), // total_value menor ou igual
    });

    const { error } = schema.validate(req.query);
    if (error) {
      throw new AppError(INVALID_FIELDS, "Invalid filter parameters", 400);
    }

    const access = await validateAndAuthorize(req, res);

    if (isValidResponse(access)) {
      // Criar condição para o filtro
      const whereCondition: any = {
        companie_id: access.companyId, // Garante que os resultados sejam da mesma empresa
      };

      // Filtra por `client_id`, se fornecido
      if (req.query.client_id) {
        whereCondition.client_id = parseInt(req.query.client_id as string, 10);
      }

      // Filtra por intervalo de datas `initial_date` e `final_date`
      const { initial_date, final_date } = req.query;
      if (initial_date && final_date) {
        whereCondition.initial_date = {
          [Op.between]: [
            new Date(initial_date as string).toISOString(),
            new Date(final_date as string).toISOString(),
          ],
        };
      } else if (initial_date) {
        whereCondition.initial_date = {
          [Op.gte]: new Date(initial_date as string).toISOString(),
        };
      } else if (final_date) {
        whereCondition.initial_date = {
          [Op.lte]: new Date(final_date as string).toISOString(),
        };
      }

      // Filtra por `status`, se fornecido
      if (req.query.status) {
        whereCondition.status = req.query.status as string;
      }

      // Filtra por `total_value`, maior ou igual (`gte`) e menor ou igual (`lte`)
      if (req.query.total_value_gte) {
        whereCondition.total_value = {
          [Op.gte]: parseFloat(req.query.total_value_gte as string),
        };
      }
      if (req.query.total_value_lte) {
        whereCondition.total_value = {
          ...whereCondition.total_value,
          [Op.lte]: parseFloat(req.query.total_value_lte as string),
        };
      }

      // Consultar ordens de serviço com base nas condições
      const serviceOrders = await serviceOrderManager.listServices({
        where: whereCondition,
      });

      return res.status(200).json({
        message: "Service orders listed successfully.",
        serviceOrders,
      });
    } else {
      return access;
    }
  }
}
