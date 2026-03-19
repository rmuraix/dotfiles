{
  description = "Home Manager configuration of rmuraix";

  inputs = {
    # Specify the source of Home Manager and Nixpkgs.
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { nixpkgs, home-manager, ... }:
    let
      lib = nixpkgs.lib;
      mkHome =
        {
          system,
          username ? "rmuraix",
          homeDirectory ?
            if lib.hasSuffix "darwin" system then "/Users/${username}" else "/home/${username}",
        }:
        home-manager.lib.homeManagerConfiguration {
          pkgs = import nixpkgs { inherit system; };
          modules = [
            ./home-manager/home.nix
            {
              home = {
                inherit username homeDirectory;
              };
            }
          ];
        };
    in
    {
      homeConfigurations = {
        rmuraix = mkHome { system = "x86_64-linux"; };
        rmuraix-aarch64-darwin = mkHome { system = "aarch64-darwin"; };
        rmuraix-x86_64-darwin = mkHome { system = "x86_64-darwin"; };
      };
    };
}
