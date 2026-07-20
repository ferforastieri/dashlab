import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const jwt = { signAsync: jest.fn().mockResolvedValue('access') };
  let db:any, service:AuthService;
  beforeEach(() => {
    db={user:{findUnique:jest.fn(),create:jest.fn(),findUniqueOrThrow:jest.fn(),update:jest.fn(),delete:jest.fn()},dashboard:{},application:{create:jest.fn()},widget:{create:jest.fn()},layoutItem:{createMany:jest.fn()},session:{create:jest.fn(),findUnique:jest.fn(),delete:jest.fn(),deleteMany:jest.fn(),findMany:jest.fn()}};
    service=new AuthService(db,jwt as any);
  });
  it('does not disclose whether login failed by user or password', async()=>{
    db.user.findUnique.mockResolvedValue(null);
    await expect(service.login({username:'unknown',password:'password1'})).rejects.toThrow(new UnauthorizedException('Usuário ou senha inválidos'));
  });
  it('invalidates all refresh sessions after password change', async()=>{
    const hash=await argon2.hash('old-password');db.user.findUniqueOrThrow.mockResolvedValue({id:'u1',passwordHash:hash});
    await expect(service.changePassword('u1',{currentPassword:'old-password',newPassword:'new-password'})).resolves.toMatchObject({message:'Senha alterada com sucesso'});
    expect(db.session.deleteMany).toHaveBeenCalledWith({where:{userId:'u1'}});
  });
  it('prevents duplicate usernames case-insensitively', async()=>{
    db.user.findUnique.mockResolvedValue({id:'u1'});
    await expect(service.register({username:'Admin',password:'password1'})).rejects.toBeInstanceOf(ConflictException);
    expect(db.user.findUnique).toHaveBeenCalledWith({where:{username:'admin'}});
  });
});
