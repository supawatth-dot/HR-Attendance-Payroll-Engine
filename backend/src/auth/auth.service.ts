import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const cleanUser = (username || '').trim();
    const id = parseInt(cleanUser, 10);

    // If login is system, admin, or ID 1, find or fallback for system admin
    if (cleanUser.toLowerCase() === 'admin' || cleanUser.toLowerCase() === 'system' || id === 1) {
      const adminEmp = await this.prisma.employee.findFirst({
        where: { OR: [{ id: 1 }, { firstName: { equals: 'System', mode: 'insensitive' } }] },
      });
      if (adminEmp) {
        return {
          id: adminEmp.id,
          firstName: adminEmp.firstName,
          lastName: adminEmp.lastName,
          role: 'ADMIN',
        };
      }
      // Fallback if DB not seeded yet so user can still access dashboard to seed/configure
      return {
        id: 1,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'ADMIN',
      };
    }

    // Otherwise lookup real employee by ID, firstName, lastName, or email
    const employee = await this.prisma.employee.findFirst({
      where: {
        OR: [
          ...(isNaN(id) ? [] : [{ id }]),
          { firstName: { equals: cleanUser, mode: 'insensitive' } },
          { lastName: { equals: cleanUser, mode: 'insensitive' } },
          { email: { equals: cleanUser, mode: 'insensitive' } },
        ],
      },
      include: { department: true, shift: true },
    });

    if (employee) {
      return {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        role: employee.id === 1 ? 'ADMIN' : 'EMPLOYEE',
      };
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: `${user.firstName} ${user.lastName}`, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async refreshToken(user: any) {
    const payload = { username: user.username, sub: user.userId, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
