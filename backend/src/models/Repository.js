import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';

const Repository = sequelize.define('Repository', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  gitPath: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '本地 Git 仓库路径'
  },
  defaultBranch: {
    type: DataTypes.STRING(50),
    defaultValue: 'main'
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['ownerId', 'name']
    }
  ]
});

// 关联关系
Repository.belongsTo(User, { 
  foreignKey: 'ownerId', 
  as: 'owner' 
});

User.hasMany(Repository, { 
  foreignKey: 'ownerId', 
  as: 'repositories' 
});

export default Repository;
