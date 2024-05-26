"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.createTable("payments", {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },

      pidx: {
        type: Sequelize.STRING,
        unique: true,
      },

      book_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "books",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      amount: {
        type: Sequelize.INTEGER,
      },
      data_verification: {
        type: Sequelize.JSON,
      },
      api_query: {
        type: Sequelize.JSON,
      },
      payment_gateway: {
        type: Sequelize.STRING,
        required: true,
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "pending",
      },
      payment_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      deleted_at: {
        allowNull: true,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addConstraint("payments", {
      type: "FOREIGN KEY",
      name: "FK_user_payment_id",
      references: {
        table: "users",
        field: "id",
      },
      fields: ["user_id"],
      onDelete: "no action",
      onUpdate: "no action",
    });

    await queryInterface.addConstraint("payments", {
      type: "FOREIGN KEY",
      name: "FK_book_payment_id",
      references: {
        table: "books",
        field: "id",
      },
      fields: ["book_id"],
      onDelete: "no action",
      onUpdate: "no action",
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.dropTable("payments");
    await queryInterface.removeConstraint("payments", "FK_user_payment_id");
    await queryInterface.removeConstraint("payments", "FK_book_payment_id");
  },
};
