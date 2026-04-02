import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
import Repository from './Repository.js';

const Collaborator = sequelize.define('Collaborator', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  repositoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Repositories',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'write', 'read'),
    allowNull: false,
    defaultValue: 'read',
    comment: 'owner=所有者, admin=管理员, write=可写, read=只读'
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'pending=待审批, accepted=已接受, rejected=已拒绝'
  },
  invitedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'repositoryId']
    }
  ]
});

// 关联关系
Collaborator.belongsTo(User, { 
  foreignKey: 'userId', 
  as: 'user' 
});

Collaborator.belongsTo(Repository, { 
  foreignKey: 'repositoryId', 
  as: 'repository' 
});

Collaborator.belongsTo(User, { 
  foreignKey: 'invitedBy', 
  as: 'inviter' 
});

Repository.hasMany(Collaborator, { 
  foreignKey: 'repositoryId', 
  as: 'collaborators' 
});

User.hasMany(Collaborator, { 
  foreignKey: 'userId', 
  as: 'collaborations' 
});

export default Collaborator;
