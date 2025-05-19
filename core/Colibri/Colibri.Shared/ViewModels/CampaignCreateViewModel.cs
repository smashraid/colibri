using System.ComponentModel.DataAnnotations;

namespace Colibri.Shared.ViewModels
{
    public class CampaignCreateViewModel
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        [Required]
        public string Name { get; set; }
        [Required]
        public int CampaignCount { get; set; }
        public string[] Tags { get; set; }
        public string CreatedBy { get; set; }
    }
}
