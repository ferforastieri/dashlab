import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private db:PrismaService){}
  private async dashboard(userId:string){const d=await this.db.dashboard.findUnique({where:{userId}});if(!d)throw new NotFoundException();return d}
  async get(userId:string,surface:'WEB'|'MOBILE'){
    const d=await this.db.dashboard.findUniqueOrThrow({where:{userId},include:{applications:{orderBy:{createdAt:'asc'}},widgets:{orderBy:{createdAt:'asc'}},layouts:{where:{surface},orderBy:{order:'asc'}}}});
    return d;
  }
  async branding(userId:string,data:any){const d=await this.dashboard(userId);return this.db.dashboard.update({where:{id:d.id},data:{name:String(data.name||d.name).slice(0,80),branding:data}})}
  async createApp(userId:string,data:any){const d=await this.dashboard(userId);const app=await this.db.application.create({data:{dashboardId:d.id,name:String(data.name).slice(0,80),url:String(data.url),description:data.description,deepLink:data.deepLink,icon:data.icon,category:data.category,statusUrl:data.statusUrl,inDock:!!data.inDock}});await this.addLayouts(d.id,'APPLICATION',app.id);return app}
  async updateApp(userId:string,id:string,data:any){await this.assertApp(userId,id);return this.db.application.update({where:{id},data:{name:data.name,url:data.url,description:data.description,deepLink:data.deepLink,icon:data.icon,category:data.category,statusUrl:data.statusUrl,inDock:data.inDock,visible:data.visible}})}
  async deleteApp(userId:string,id:string){await this.assertApp(userId,id);await this.db.application.delete({where:{id}});return{ok:true}}
  async createWidget(userId:string,data:any){const d=await this.dashboard(userId);const allowed=['SYSTEM','STORAGE','NETWORK','CLOCK','WEATHER','SEARCH','STATUS','PROMQL'];if(!allowed.includes(data.type))throw new ForbiddenException('Tipo inválido');const widget=await this.db.widget.create({data:{dashboardId:d.id,title:String(data.title).slice(0,80),type:data.type,config:data.config||{}}});await this.addLayouts(d.id,'WIDGET',widget.id);return widget}
  async updateWidget(userId:string,id:string,data:any){await this.assertWidget(userId,id);return this.db.widget.update({where:{id},data:{title:data.title,type:data.type,config:data.config,visible:data.visible}})}
  async deleteWidget(userId:string,id:string){await this.assertWidget(userId,id);await this.db.widget.delete({where:{id}});return{ok:true}}
  async saveLayout(userId:string,surface:'WEB'|'MOBILE',items:any[]){const d=await this.dashboard(userId);const ownedApps=new Set((await this.db.application.findMany({where:{dashboardId:d.id},select:{id:true}})).map(x=>x.id));const ownedWidgets=new Set((await this.db.widget.findMany({where:{dashboardId:d.id},select:{id:true}})).map(x=>x.id));await this.db.$transaction(async tx=>{await tx.layoutItem.deleteMany({where:{dashboardId:d.id,surface}});for(const [order,item] of items.entries()){const isApp=item.kind==='APPLICATION';const target=isApp?item.applicationId:item.widgetId;if(!(isApp?ownedApps:ownedWidgets).has(target))throw new ForbiddenException();await tx.layoutItem.create({data:{dashboardId:d.id,surface,kind:item.kind,x:+item.x||0,y:+item.y||0,w:Math.max(1,+item.w||1),h:Math.max(1,+item.h||1),order,applicationId:isApp?target:null,widgetId:isApp?null:target}})}});return{ok:true}}
  async metrics(){
    const base=process.env.PROMETHEUS_URL||'http://127.0.0.1:9090';
    const queries:any={cpu:'100 - avg(rate(node_cpu_seconds_total{tipo="Servidor",mode="idle"}[5m])) * 100',memory:'(1-node_memory_MemAvailable_bytes{tipo="Servidor"}/node_memory_MemTotal_bytes{tipo="Servidor"})*100',disk:'(1-node_filesystem_avail_bytes{tipo="Servidor",mountpoint="/"}/node_filesystem_size_bytes{tipo="Servidor",mountpoint="/"})*100',download:'sum(rate(node_network_receive_bytes_total{tipo="Servidor",device!="lo"}[5m]))',upload:'sum(rate(node_network_transmit_bytes_total{tipo="Servidor",device!="lo"}[5m]))'};
    const result:any={};await Promise.all(Object.entries(queries).map(async([key,q])=>{try{const controller=new AbortController();setTimeout(()=>controller.abort(),4000);const response=await fetch(`${base}/api/v1/query?query=${encodeURIComponent(q as string)}`,{signal:controller.signal});const json:any=await response.json();result[key]=Number(json?.data?.result?.[0]?.value?.[1]||0)}catch{result[key]=null}}));return result;
  }
  async promql(userId:string,id:string){const widget=await this.assertWidget(userId,id);if(widget.type!=='PROMQL')throw new ForbiddenException();const query=String((widget.config as any)?.query||'');if(!query||query.length>1000)throw new ForbiddenException('Consulta inválida');const base=process.env.PROMETHEUS_URL||'';const response=await fetch(`${base}/api/v1/query?query=${encodeURIComponent(query)}`);return response.json()}
  private async assertApp(userId:string,id:string){const x=await this.db.application.findFirst({where:{id,dashboard:{userId}}});if(!x)throw new NotFoundException();return x}
  private async assertWidget(userId:string,id:string){const x=await this.db.widget.findFirst({where:{id,dashboard:{userId}}});if(!x)throw new NotFoundException();return x}
  private async addLayouts(dashboardId:string,kind:'APPLICATION'|'WIDGET',id:string){const count=await this.db.layoutItem.count({where:{dashboardId}});await this.db.layoutItem.createMany({data:['WEB','MOBILE'].map((surface:any)=>({dashboardId,surface,kind,order:count,applicationId:kind==='APPLICATION'?id:null,widgetId:kind==='WIDGET'?id:null}))})}
}
