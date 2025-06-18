#!/bin/bash

# Script di automazione per il rilascio di Presto
# Gestisce versioning, commit, tag, push e build automaticamente

set -e  # Esce immediatamente se un comando fallisce

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funzioni helper
print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Funzione per incrementare la versione
increment_version() {
    local version=$1
    local type=$2
    
    IFS='.' read -ra VERSION_PARTS <<< "$version"
    local major=${VERSION_PARTS[0]}
    local minor=${VERSION_PARTS[1]}
    local patch=${VERSION_PARTS[2]}
    
    case $type in
        "major")
            major=$((major + 1))
            minor=0
            patch=0
            ;;
        "minor")
            minor=$((minor + 1))
            patch=0
            ;;
        "patch")
            patch=$((patch + 1))
            ;;
        *)
            echo "Tipo di versione non valido: $type"
            exit 1
            ;;
    esac
    
    echo "$major.$minor.$patch"
}

# Funzione per aggiornare la versione nei file
update_version_in_files() {
    local old_version=$1
    local new_version=$2
    
    print_step "Aggiornamento versione da $old_version a $new_version..."
    
    # Aggiorna package.json
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"version\": \"$old_version\"/\"version\": \"$new_version\"/" package.json
        sed -i '' "s/version = \"$old_version\"/version = \"$new_version\"/" src-tauri/Cargo.toml
        sed -i '' "s/\"version\": \"$old_version\"/\"version\": \"$new_version\"/" src-tauri/tauri.conf.json
        # Aggiorna version.js
        sed -i '' "s/APP_VERSION = '$old_version'/APP_VERSION = '$new_version'/" src/version.js
    else
        # Linux
        sed -i "s/\"version\": \"$old_version\"/\"version\": \"$new_version\"/" package.json
        sed -i "s/version = \"$old_version\"/version = \"$new_version\"/" src-tauri/Cargo.toml
        sed -i "s/\"version\": \"$old_version\"/\"version\": \"$new_version\"/" src-tauri/tauri.conf.json
        # Aggiorna version.js
        sed -i "s/APP_VERSION = '$old_version'/APP_VERSION = '$new_version'/" src/version.js
    fi
    
    print_success "Versione aggiornata nei file di configurazione"
}

# Funzione per ottenere la versione corrente
get_current_version() {
    grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
}

# Funzione per verificare se la directory è pulita
check_git_status() {
    if [[ -n $(git status --porcelain) ]]; then
        print_warning "Ci sono modifiche non committate. Vuoi continuare? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_error "Operazione annullata"
            exit 1
        fi
    fi
}

# Funzione per fare il commit e tag
commit_and_tag() {
    local version=$1
    local message="$2"
    
    print_step "Aggiunta file modificati a git..."
    git add package.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json src/version.js
    
    # Se ci sono altri file modificati, chiedi se aggiungerli
    if [[ -n $(git status --porcelain | grep -v "package.json\|Cargo.toml\|Cargo.lock\|tauri.conf.json\|version.js") ]]; then
        print_warning "Ci sono altri file modificati. Vuoi aggiungerli al commit? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            git add .
        fi
    fi
    
    print_step "Commit delle modifiche..."
    git commit -m "chore: release v$version${message:+ - $message}"
    
    print_step "Creazione tag v$version..."
    git tag -a "v$version" -m "Release v$version${message:+ - $message}"
    
    print_success "Commit e tag creati"
}

# Funzione per fare il push
push_changes() {
    local version=$1
    
    print_step "Push del commit principale..."
    git push origin main
    
    print_step "Push del tag v$version..."
    git push origin "v$version"
    
    print_success "Push completato"
}

# Funzione per aggiornare il tap Homebrew
update_homebrew_tap() {
    local version=$1
    local tap_repo_path="../homebrew-presto"
    
    print_step "Aggiornamento del tap Homebrew..."
    
    if [ ! -d "$tap_repo_path" ]; then
        print_warning "Repository del tap Homebrew non trovato: $tap_repo_path"
        print_warning "Saltando l'aggiornamento del tap Homebrew"
        return 0
    fi
    
    # Vai nella directory del tap
    cd "$tap_repo_path"
    
    # Esegui lo script di aggiornamento
    if [ -x "./update-homebrew-tap.sh" ]; then
        ./update-homebrew-tap.sh "$version"
        print_success "Tap Homebrew aggiornato alla versione $version"
    else
        print_warning "Script di aggiornamento del tap non trovato o non eseguibile"
    fi
    
    # Torna alla directory originale
    cd - > /dev/null
}

# Funzione per fare la build
build_app() {
    print_step "Avvio build dell'applicazione..."
    npm run build
    print_success "Build completata"
}

# Funzione per aprire GitHub releases
open_github_releases() {
    local repo_url=$(git config --get remote.origin.url)
    if [[ $repo_url == *"github.com"* ]]; then
        # Converte SSH URL in HTTPS
        repo_url=$(echo $repo_url | sed 's/git@github.com:/https:\/\/github.com\//' | sed 's/\.git$//')
        local releases_url="$repo_url/releases/new"
        print_step "Aprendo pagina GitHub releases..."
        if command -v open &> /dev/null; then
            open "$releases_url"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "$releases_url"
        else
            echo "Apri manualmente: $releases_url"
        fi
    fi
}

# Funzione principale
main() {
    echo -e "${BLUE}"
    echo "🚀 Script di Rilascio Automatico per Presto"
    echo "===========================================${NC}"
    
    # Controlla se siamo in una repo git
    if [[ ! -d .git ]]; then
        print_error "Non sei in una repository git"
        exit 1
    fi
    
    # Ottieni versione corrente
    current_version=$(get_current_version)
    print_step "Versione corrente: $current_version"
    
    # Chiedi tipo di rilascio
    echo ""
    echo "Che tipo di rilascio vuoi fare?"
    echo "1) Patch (${current_version} → $(increment_version $current_version patch))"
    echo "2) Minor (${current_version} → $(increment_version $current_version minor))"
    echo "3) Major (${current_version} → $(increment_version $current_version major))"
    echo "4) Versione specifica"
    echo "5) Solo build (senza aggiornare versione)"
    echo ""
    read -p "Seleziona un'opzione (1-5): " choice
    
    case $choice in
        1)
            release_type="patch"
            new_version=$(increment_version $current_version patch)
            ;;
        2)
            release_type="minor"
            new_version=$(increment_version $current_version minor)
            ;;
        3)
            release_type="major"
            new_version=$(increment_version $current_version major)
            ;;
        4)
            read -p "Inserisci la nuova versione (formato x.y.z): " new_version
            if [[ ! $new_version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                print_error "Formato versione non valido"
                exit 1
            fi
            release_type="custom"
            ;;
        5)
            print_step "Solo build senza aggiornamento versione..."
            build_app
            print_success "Build completata!"
            exit 0
            ;;
        *)
            print_error "Opzione non valida"
            exit 1
            ;;
    esac
    
    # Messaggio opzionale per il rilascio
    read -p "Messaggio opzionale per questo rilascio: " release_message
    
    echo ""
    print_step "Rilascio pianificato: $current_version → $new_version"
    if [[ -n "$release_message" ]]; then
        echo "Messaggio: $release_message"
    fi
    echo ""
    
    # Conferma finale
    read -p "Continuare con il rilascio? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_error "Rilascio annullato"
        exit 1
    fi
    
    # Verifica stato git
    check_git_status
    
    # Aggiorna versione nei file
    update_version_in_files $current_version $new_version
    
    # Commit e tag
    commit_and_tag $new_version "$release_message"
    
    # Push
    push_changes $new_version
    
    # Build
    build_app
    
    # Aggiorna tap Homebrew
    update_homebrew_tap $new_version
    
    # Apri GitHub releases
    print_step "Vuoi aprire la pagina GitHub releases per completare il rilascio? (Y/n)"
    read -r open_github
    if [[ ! "$open_github" =~ ^[Nn]$ ]]; then
        open_github_releases
    fi
    
    echo ""
    print_success "🎉 Rilascio v$new_version completato con successo!"
    echo ""
    echo "Prossimi passi:"
    echo "1. Verifica che la build sia completata correttamente"
    echo "2. Se hai aperto GitHub, crea la release con i file compilati"
    echo "3. Il tag v$new_version è stato creato per il sistema di aggiornamenti automatici"
    echo "4. Testa l'aggiornamento automatico dell'app"
    echo ""
    
    # Mostra informazioni sui file generati
    if [[ -d "src-tauri/target" ]]; then
        echo "File di build generati:"
        find src-tauri/target -name "*.dmg" -o -name "*.app" -o -name "*.deb" -o -name "*.AppImage" 2>/dev/null | head -5
    fi
}

# Gestione parametri da riga di comando
if [[ $# -gt 0 ]]; then
    case $1 in
        "--help"|"-h")
            echo "Uso: $0 [opzioni]"
            echo ""
            echo "Opzioni:"
            echo "  --patch     Incrementa versione patch"
            echo "  --minor     Incrementa versione minor"
            echo "  --major     Incrementa versione major"
            echo "  --version X.Y.Z  Imposta versione specifica"
            echo "  --build-only     Solo build senza aggiornare versione"
            echo "  --help      Mostra questo messaggio"
            echo ""
            echo "Esempi:"
            echo "  $0              # Modalità interattiva"
            echo "  $0 --patch      # Rilascio patch automatico"
            echo "  $0 --version 1.0.0  # Versione specifica"
            exit 0
            ;;
        "--patch")
            current_version=$(get_current_version)
            new_version=$(increment_version $current_version patch)
            update_version_in_files $current_version $new_version
            commit_and_tag $new_version
            push_changes $new_version
            build_app
            update_homebrew_tap $new_version
            print_success "Rilascio patch v$new_version completato!"
            ;;
        "--minor")
            current_version=$(get_current_version)
            new_version=$(increment_version $current_version minor)
            update_version_in_files $current_version $new_version
            commit_and_tag $new_version
            push_changes $new_version
            build_app
            update_homebrew_tap $new_version
            print_success "Rilascio minor v$new_version completato!"
            ;;
        "--major")
            current_version=$(get_current_version)
            new_version=$(increment_version $current_version major)
            update_version_in_files $current_version $new_version
            commit_and_tag $new_version
            push_changes $new_version
            build_app
            update_homebrew_tap $new_version
            print_success "Rilascio major v$new_version completato!"
            ;;
        "--version")
            if [[ -z $2 ]] || [[ ! $2 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                print_error "Versione non specificata o formato non valido"
                exit 1
            fi
            current_version=$(get_current_version)
            new_version=$2
            update_version_in_files $current_version $new_version
            commit_and_tag $new_version
            push_changes $new_version
            build_app
            update_homebrew_tap $new_version
            print_success "Rilascio v$new_version completato!"
            ;;
        "--build-only")
            build_app
            print_success "Build completata!"
            ;;
        *)
            print_error "Opzione non riconosciuta: $1"
            echo "Usa --help per vedere le opzioni disponibili"
            exit 1
            ;;
    esac
else
    # Modalità interattiva
    main
fi
