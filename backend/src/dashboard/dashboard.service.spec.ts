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
  it('offers the four supported layouts',()=>{
    expect(new DashboardService({} as any).presets().map(x=>x.id)).toEqual(['FREE','ZIMA','FOCUS','COMPACT']);
  });
  it('saves layout changes only in the active preset',async()=>{
    const tx:any={layoutItem:{deleteMany:jest.fn(),create:jest.fn()}};
    const db:any={dashboard:{findUnique:jest.fn().mockResolvedValue({id:'d1',layoutPreset:'ZIMA'})},application:{findMany:jest.fn().mockResolvedValue([{id:'a1'}])},widget:{findMany:jest.fn().mockResolvedValue([])},$transaction:jest.fn((fn:any)=>fn(tx))};
    await new DashboardService(db).saveLayout('u1','WEB',[{kind:'APPLICATION',applicationId:'a1',x:3,y:0,w:2,h:2} as any]);
    expect(tx.layoutItem.deleteMany).toHaveBeenCalledWith({where:{dashboardId:'d1',surface:'WEB',preset:'ZIMA'}});
    expect(tx.layoutItem.create).toHaveBeenCalledWith({data:expect.objectContaining({preset:'ZIMA',applicationId:'a1'})});
  });
});
