import { CampaignListDb } from "../../models/campaign/campaignList.model";


export interface CampaignRead {
    id: number;
    name: string;
    campaignCount: number;
    tags: string[];
    createdBy: string;
    createdDate:string;
    updatedBy:string;
    updatedDate:string;
    status:number;
    projectId:number;
    projectWebsite:string;
    lists: CampaignListDb[]
}