import { CampaignListDb } from "../../models/campaign/campaignList.model";


export interface CampaignRead {
    id: number;
    name: string;
    campaignCount: number;
    tags: string[];
    lists: CampaignListDb[]
}