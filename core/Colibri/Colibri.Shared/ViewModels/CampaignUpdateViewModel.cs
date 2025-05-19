using System.ComponentModel.DataAnnotations;

namespace Colibri.Shared.ViewModels
{
    public class CampaignUpdateViewModel
    {
        public int Id { get; set; }
        public string[] Tags { get; set; }
        [Required]
        public string UpdatedBy { get; set; }
        [Required]
        public DateTimeOffset UpdatedDate { get; set; }
        [Required]
        public CampaignStatus Status { get; set; }
    }
}