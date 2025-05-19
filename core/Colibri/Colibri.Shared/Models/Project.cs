using System.ComponentModel.DataAnnotations;

namespace Colibri.Shared.Models
{
    public class Project
    {
        [Key]
        public int Id { get; set; }
        [Required]
        public long IterableId { get; set; }
        [Required]
        public string Website { get; set; }
        [Required]
        public string ApiKey { get; set; }
    }
}
