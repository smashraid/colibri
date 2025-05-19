using System.ComponentModel.DataAnnotations;

namespace Colibri.Shared.ViewModels
{
    public class CampaignListCreateViewModel
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; }
        [Required]
        public long IterableCampaignId { get; set; }
        [Required]
        public long IterableListId { get; set; }
        [Required]
        public long IterableTemplateId { get; set; }
        [Required]
        public string SendAt { get; set; }
        [Required]
        public short Order { get; set; }
        [Required]
        public string StartTimeZone { get; set; } = "America/New_York";
        [Required]
        public string DefaultTimeZone { get; set; } = "America/New_York";
        [Required]
        public string[] Emails { get; set; }
    }
}
