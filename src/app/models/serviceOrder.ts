import {
  AllowNull,
  AutoIncrement,
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

@Table({ paranoid: true })
class serviceOrder extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  declare id: number;

  @AllowNull(false)
  @Column
  technician_id: number;

  @AllowNull(false)
  @Column
  client_id: number;

  @Column({ type: DataType.JSON })
  transactionIds: number[];

  @AllowNull(false)
  @Column
  companie_id: number;

  @Column
  initial_date: Date;

  @Column
  final_date: Date;

  @Column
  delivery_declaration: string;

  @Column
  problem: string;

  @Column
  solution: string;

  @Column
  return_declaration: string;

  @Column
  hours: number;

  @Column
  total_value: number;

  @AllowNull(false)
  @Column
  status: string;
}

export default serviceOrder;
