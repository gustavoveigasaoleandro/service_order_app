/*import { RabbitMQService } from ".";

// Função para iniciar o RabbitMQ e configurar exchanges, filas e bindings
export async function startApp() {
  const rabbitMQService = new RabbitMQService();

  try {
    // Configura as exchanges
    await rabbitMQService.createExchange(
      "authorization.response_service_order_dlx"
    );
    await rabbitMQService.createExchange(
      "authorization.response_service_order_ex"
    );

    // Configura as filas com Dead Letter Exchange (DLX) se aplicável
    await rabbitMQService.createQueue(
      "authorization.response_service_order",
      "authorization.response_service_order_dlx"
    );

    await rabbitMQService.createQueue(
      "authorization.response_response_service_order_dlq"
    );

    // Cria os bindings entre as filas e exchanges
    await rabbitMQService.createBinding(
      "authorization.response_service_order",
      "authorization.response_ex",
      "authorization.service_order"
    );

    await rabbitMQService.createBinding(
      "authorization.response_service_order_dlq",
      "authorization.response_service_order_dlx",
      ""
    );

    console.log("RabbitMQ setup completed successfully.");
  } catch (error) {
    console.error("Error during RabbitMQ setup:", error);
  }
}
*/
