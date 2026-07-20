import { NotFoundException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

describe('DashboardService tenant isolation',()=>{
  it('does not update an application owned by another user',async()=>{
    const db:any={application:{findFirst:jest.fn().mockResolvedValue(null),update:jest.fn()}};
    const service=new DashboardService(db);
    await expect(service.updateApp('user-a','app-b',{name:'intrusion'} as any)).rejects.toBeInstanceOf(NotFoundException);
    expect(db.application.update).not.toHaveBeenCalled();
  });
  it('does not expose another users widget query',async()=>{
    const db:any={widget:{findFirst:jest.fn().mockResolvedValue(null)}};
    await expect(new DashboardService(db).promql('user-a','widget-b')).rejects.toBeInstanceOf(NotFoundException);
  });
});
