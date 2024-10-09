import amqp, { Channel, Connection } from "amqplib";
import dotenv from "dotenv";

dotenv.config();

export class RabbitMQService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  constructor() {
    this.initializeRabbitMQ();
  }

  private async initializeRabbitMQ() {
    if (!this.channel) {
      try {
        this.connection = await amqp.connect({
          protocol: "amqp",
          hostname: process.env.RABBITMQ_HOST, // Endereço do servidor RabbitMQ, padrão é localhost
          port: process.env.RABBITMQ_PORT
            ? parseInt(process.env.RABBITMQ_PORT)
            : 5672, // Porta padrão do RabbitMQ
          username: process.env.RABBITMQ_USER || "guest", // Usuário do RabbitMQ, padrão é guest
          password: process.env.RABBITMQ_PASSWORD || "guest", // Senha do RabbitMQ, padrão é guest
          vhost: process.env.RABBITMQ_VHOST || "/", // Virtual host, padrão é '/'
        });
        this.channel = await this.connection.createChannel();
        console.log("RabbitMQ Channel and Connection Initialized");
      } catch (error) {
        console.error("Erro ao inicializar RabbitMQ:", error);
        throw error; // Re-throw the error to prevent further execution
      }
    }
  }

  public async createExchange(
    exchangeName: string,
    exchangeType: string = "direct"
  ) {
    if (!this.channel) {
      console.error("Canal não está inicializado.");
      return;
    }

    try {
      await this.channel.assertExchange(exchangeName, exchangeType, {
        durable: true,
      });
      console.log(
        `Exchange "${exchangeName}" do tipo "${exchangeType}" criada.`
      );
    } catch (error) {
      console.error("Erro ao criar a exchange:", error);
    }
  }

  public async createQueue(queueName: string, dlxName: string | null = null) {
    if (!this.channel) {
      console.error("Canal não está inicializado.");
      return;
    }

    try {
      const queueOptions = {
        durable: true,
        ...(dlxName && { arguments: { "x-dead-letter-exchange": dlxName } }),
      };

      await this.channel.assertQueue(queueName, queueOptions);
      console.log(`Fila "${queueName}" criada com sucesso.`);

      if (dlxName) {
        console.log(
          `Dead Letter Exchange "${dlxName}" configurado para a fila "${queueName}".`
        );
      }
    } catch (error) {
      console.error("Erro ao criar a fila:", error);
    }
  }

  public async createBinding(
    queueName: string,
    exchangeName: string,
    routingKey: string = ""
  ) {
    if (!this.channel) {
      console.error("Canal não está inicializado.");
      return;
    }

    try {
      await this.channel.bindQueue(queueName, exchangeName, routingKey);
      console.log(
        `Binding criado entre a fila "${queueName}" e o exchange "${exchangeName}" com a routing key "${routingKey}".`
      );
    } catch (error) {
      console.error("Erro ao criar o binding:", error);
    }
  }

  public async publishToExchange(
    exchangeName: string,
    routingKey: string,
    response_routingKey: string,
    message: Record<string, any> | string | Buffer,
    correlationId: string,
    replyTo: string
  ) {
    if (!this.channel) {
      console.error("Canal não está inicializado.");
      return;
    }
    try {
      this.channel.publish(
        exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          contentType: "application/json",
          correlationId: correlationId,
          replyTo: replyTo,
          headers: {
            customRoutingKey: response_routingKey, // Inclui a routingKey como um header customizado
          },
        }
      );

      console.log(
        `Mensagem enviada para a exchange "${exchangeName}" com a routing key "${routingKey}", correlationId: "${correlationId}"`
      );
    } catch (error) {
      console.error("Erro ao enviar mensagem para a exchange:", error);
    }
  }

  public async listenForResponse(
    queueName: string,
    correlationId: string,
    isListening: { value: boolean }
  ): Promise<any> {
    if (!this.connection) {
      console.error("Conexão RabbitMQ não inicializada.");
      throw new Error("Conexão RabbitMQ não inicializada.");
    }

    const channel = await this.connection.createChannel(); // Cria um novo canal

    return new Promise(async (resolve, reject) => {
      // Função de callback para processar mensagens
      const onMessage = async (msg: any) => {
        console.log("message: ", msg);

        const consumerTag = msg.fields.consumerTag;

        if (!isListening.value || !consumerTag) {
          return; // Interrompe se a escuta foi cancelada ou se o consumerTag não foi inicializado
        }

        const msgCorrelationId = msg.properties.correlationId;
        console.log(
          "Id esperado:",
          correlationId,
          "Id recebido:",
          msgCorrelationId
        );

        if (msgCorrelationId === correlationId) {
          const response = JSON.parse(msg.content.toString());
          try {
            console.log("Confirmando mensagem (ack)...");
            await channel.ack(msg); // Confirma o processamento da mensagem correta
            console.log("Mensagem confirmada (ack).");

            // Cancela o consumo após receber a resposta correta
            if (consumerTag) {
              console.log("Cancelando consumo com consumerTag:", consumerTag);
              await channel.cancel(consumerTag);
              console.log("Consumo cancelado após a resposta.");
            }

            isListening.value = false;

            // Fecha o canal após garantir que tudo foi processado
            setTimeout(async () => {
              try {
                console.log("Fechando canal...");
                await channel.close(); // Fecha o canal após garantir que tudo foi processado
                console.log("Canal fechado após consumo.");
              } catch (closeError) {
                console.error("Erro ao fechar o canal:", closeError);
              }
            }, 500); // Adiciona um tempo de espera antes de fechar o canal

            resolve(response); // Retorna a resposta
          } catch (ackError) {
            console.error("Erro ao confirmar a mensagem (ack):", ackError);
            reject(ackError);
          }
        } else {
          try {
            console.log("CorrelationId não corresponde, descartando mensagem.");
            await channel.nack(msg, false, true); // Reinsere a mensagem na fila
            console.log("Mensagem rejeitada (nack) e reintroduzida na fila.");
          } catch (nackError) {
            console.error("Erro ao realizar o nack:", nackError);
          }
        }
      };

      try {
        console.log(`Iniciando consumo da fila: ${queueName}`);
        await channel.consume(queueName, onMessage, {
          noAck: false, // Exige confirmação manual
        });
      } catch (error) {
        console.error("Erro ao consumir mensagens da fila:", error);
        try {
          await channel.close(); // Garante que o canal seja fechado em caso de erro
        } catch (closeError) {
          console.error(
            "Erro ao fechar o canal após falha no consumo:",
            closeError
          );
        }
        reject(error);
      }
    });
  }
}
